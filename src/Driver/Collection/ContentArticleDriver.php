<?php
/**
 * @package       WT Yandex map items
 * @version    2.0.4
 * @author        Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2025 Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link          https://web-tolk.ru
 * @since      2.0.0
 */

namespace Joomla\Module\Wtyandexmapitems\Site\Driver\Collection;

use Exception;
use Joomla\CMS\Access\Access;
use Joomla\CMS\Cache\CacheController;
use Joomla\CMS\Cache\CacheControllerFactoryInterface;
use Joomla\CMS\Component\ComponentHelper;
use Joomla\CMS\Event\AbstractEvent;
use Joomla\CMS\Factory;
use Joomla\CMS\HTML\HTMLHelper;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Router\Route;
use Joomla\CMS\Uri\Uri;
use Joomla\Component\Content\Administrator\Extension\ContentComponent;
use Joomla\Component\Content\Site\Helper\RouteHelper;
use Joomla\Component\Content\Site\Model\ArticlesModel;
use Joomla\Component\Fields\Administrator\Helper\FieldsHelper;
use Joomla\Component\Fields\Administrator\Model\FieldModel;
use Joomla\Module\Wtyandexmapitems\Site\Driver\AbstractDriver;
use Joomla\Registry\Registry;
use stdClass;

// No direct access to this file
defined('_JEXEC') or die;

class ContentArticleDriver extends AbstractDriver
{
    /**
     * Current driver context
     *
     * @var string
     *
     * @since 2.0.0
     */
    public $context = 'com_content.article';

    /**
     * Module params
     *
     * @var Registry
     *
     * @since 2.0.0
     */
    public $params;

    /**
     * Field model
     *
     * @var FieldModel
     *
     * @since 2.0.0
     */
    private $fieldModel;

    /**
     * Field cache
     *
     * @var array
     *
     * @since 2.0.0
     */
    private $fieldsCache = [];

    /**
     * Get com_content articles with fields list as a Yandex map markers
     *
     * @return array
     *
     * @since 2.0.0
     */
    public function getItems(): array
    {
        $lifetime = 0;

        if ($this->params->get('use_custom_cache_time') === 1)
        {
            $lifetime = $this->params->get('custom_cache_time');
        }

        $data = [];
        $data['isPopupModal'] = $this->params->get('use_popup') === 'custom' && $this->params->get('popup_type') === 'modal';
        if ($data['isPopupModal'] === true)
        {
            $data['popupFramework'] = $this->params->get('popup_framework');
        }

        /** @var CacheController $cache */
        $cache = Factory::getContainer()->get(CacheControllerFactoryInterface::class)->createCacheController('', [
            'defaultgroup' => 'mod_wtyandexmapitems',
            'lifetime' => $lifetime,
            'caching' => $lifetime > 0
        ]);

        $cacheKey = $this->context . '_items' . $this->app->getInput()->get('module_id');

        if ($cache->contains($cacheKey))
        {
            $items = $cache->get($cacheKey);
            $data['items'] = $items ?: [];

            return $data;
        }

        $items = $this->getArticles($this->params);
        $data['items'] = $items ?: [];

        // cache values
        $cache->store($items, $cacheKey);

        return $data;
    }

    /**
     * Get com_content article from id
     *
     * @param int $id Article id
     * @param Registry $params Module parameters
     *
     * @return object|bool Article instance on success or false on failure
     *
     * @since 2.0.0
     */
    private function getArticle(int $id, Registry $params): object|bool
    {
        /** @var \Joomla\Component\Content\Site\Model\ArticleModel $model */
        $model = $this->app->bootComponent('com_content')->getMVCFactory()->createModel('Article', 'Site', ['ignore_request' => true]);

        $appParams = $this->app->getParams();
        $model->setState('params', $appParams);

        // Access filter
        $access = !ComponentHelper::getParams('com_content')->get('show_noauth');
        $model->setState('filter.access', $access);
        $model->setState('filter.published', ContentComponent::CONDITION_PUBLISHED);
        $model->setState('filter.archived', ContentComponent::CONDITION_ARCHIVED);
        $model->setState('filter.language', $this->app->getLanguageFilter());
        $model->setState('article.id', $id);

        try
        {
            $item = $model->getItem();
        }
        catch (Exception)
        {
            return false;
        }

        $authorised = Access::getAuthorisedViewLevels($this->app->getIdentity()->id);
        // Check if we should trigger additional plugin events
        $triggerEvents = $params->get('article_triggerevents', 1);

        /**
         * Подключаем файл с языковыми константами
         */
        $lang = $this->app->getLanguage();
        $extension = 'com_content';
        $base_dir = JPATH_SITE;
        $reload = true;
        $lang->load($extension, $base_dir, $lang->getTag(), $reload);

        $item->readmore = strlen(trim($item->fulltext));
        $item->slug = $item->id . ':' . $item->alias;

        if ($access || in_array($item->access, $authorised))
        {
            // We know that user has the privilege to view the article
            $item->link = Route::_(RouteHelper::getArticleRoute($item->slug, $item->catid, $item->language));
            $item->linkText = Text::_('COM_CONTENT_READ_MORE');
        }
        else
        {
            $item->link = new Uri(Route::_('index.php?option=com_users&view=login', false));
            $item->link->setVar('return', base64_encode(RouteHelper::getArticleRoute($item->slug, $item->catid, $item->language)));
            $item->linkText = Text::_('COM_CONTENT_REGISTER_TO_READ_MORE');
        }
//        $item->introtext = HTMLHelper::_('content.prepare', $item->introtext, '', 'mod_wtyandexmapitems.content');
        $this->itemTriggerEvents($item);
        // Try insert fields in $item
        try
        {
            $item->jcfields = FieldsHelper::getFields('com_content.article', $item, true);

            foreach ($item->jcfields as $elem)
            {
                if ($elem->type == 'media' && $elem->rawvalue)
                {
                    $elem->rawvalue = json_decode($elem->rawvalue);

                    if ($elem->rawvalue->imagefile)
                    {
                        $imgObj = HTMLHelper::cleanImageURL($elem->rawvalue->imagefile);
                        unset($elem->rawvalue->imagefile);
                        $elem->rawvalue = (object) array_merge((array)$elem->rawvalue, (array)$imgObj);
                    }
                }
            }
        }
        catch (Exception)
        {
            $item->jcfields = [];
        }

        // Convert images string to json array
        $item->images = json_decode($item->images);

        if ($item->images->image_intro)
        {
            $imgObj = HTMLHelper::cleanImageURL($item->images->image_intro);
            $item->images->image_intro = $imgObj;
        }

        if ($item->images->image_fulltext)
        {
            $imgObj = HTMLHelper::cleanImageURL($item->images->image_fulltext);
            $item->images->image_fulltext = $imgObj;
        }

        if ($triggerEvents)
        {
            $contentEventArguments = [
                'context' => 'com_content.article',
                'subject' => $item,
                'params'  => $item->params,
                'page'    => 0,
            ];

            $contentEvents = [
                'onContentPrepare'    => AbstractEvent::create('onContentPrepare', $contentEventArguments),
                'onContentAfterTitle' => AbstractEvent::create('onContentAfterTitle', $contentEventArguments),
                'onContentBeforeDisplay'  => AbstractEvent::create('onContentBeforeDisplay', $contentEventArguments),
                'onContentAfterDisplay'  => AbstractEvent::create('onContentAfterDisplay', $contentEventArguments),
            ];

            foreach ($contentEvents as $resultKey => $event) {
                $results = $this->app->getDispatcher()->dispatch($event->getName(), $event)->getArgument('result', []);
                if ($resultKey == 'onContentPrepare')
                {
                    continue;
                }
                $item->{$resultKey} = $results ? trim(implode("\n", $results)) : '';
            }
        }

        return $item;
    }

    private function createFieldsCache(): void
    {
        $fields = FieldsHelper::getFields('com_content.article', []);

        $this->fieldsCache = [];

        foreach ($fields as $element)
        {
            $field = new stdClass();
            $field->id = $element->id;
            $field->name = $element->name;
            $field->type = $element->type;
            $field->default_value = $element->default_value;
            $this->fieldsCache[$field->name] = $field;
        }
    }

    private function getFields($itemId, $fieldIds): array
    {
        if ($this->fieldModel == null)
        {
            $this->fieldModel = $this->app->bootComponent('com_fields')->getMVCFactory()->createModel('Field', 'Administrator', ['ignore_request' => true]);
        }

        $fieldValues = $this->fieldModel->getFieldValues($fieldIds, $itemId);

        foreach ($this->fieldsCache as &$elem)
        {
            if (!isset($fieldValues[$elem->id]) || $fieldValues[$elem->id] === '')
            {
                $elem->rawvalue = $elem->default_value;
            }
            else
            {
                $elem->rawvalue = $fieldValues[$elem->id];
            }

            if ($elem->type == 'media' && $elem->rawvalue)
            {
                $elem->rawvalue = json_decode($elem->rawvalue);

                if ($elem->rawvalue->imagefile)
                {
                    $imgObj = HTMLHelper::cleanImageURL($elem->rawvalue->imagefile);
                    unset($elem->rawvalue->imagefile);
                    $elem->rawvalue = (object) array_merge((array)$elem->rawvalue, (array)$imgObj);
                }
            }
        }

        return $this->fieldsCache;
    }

    private function addItemProperties(&$item, $access, $authorised): void
    {
        $item->readmore = strlen(trim($item->fulltext));
        $item->slug = $item->id . ':' . $item->alias;

        if ($access || in_array($item->access, $authorised))
        {
            // We know that user has the privilege to view the article
            $item->link = Route::_(RouteHelper::getArticleRoute($item->slug, $item->catid, $item->language));
            $item->linkText = Text::_('COM_CONTENT_READ_MORE');
        }
        else
        {
            $item->link = new Uri(Route::_('index.php?option=com_users&view=login', false));
            $item->link->setVar('return', base64_encode(RouteHelper::getArticleRoute($item->slug, $item->catid, $item->language)));
            $item->linkText = Text::_('COM_CONTENT_REGISTER_TO_READ_MORE');
        }
    }

    /**
     * Обработка содержимого контент-плагинами
     *
     * @param object $item Объект материала
     *
     *
     * @since version
     */
    private function itemTriggerEvents(&$item): void
    {
        if (!empty($item->text))
        {
            $item->text = HTMLHelper::_('content.prepare', $item->text, '', 'com_content.article');
        }
        if (!empty($item->introtext))
        {
            $item->introtext = HTMLHelper::_('content.prepare', $item->introtext, '', 'com_content.article');
        }
        if (!empty($item->fulltext))
        {
            $item->fulltext = HTMLHelper::_('content.prepare', $item->fulltext, '', 'com_content.article');
        }
    }

    private function addItemJcfields(&$item, $params): void
    {
        try
        {
            $fieldIds = $this->getJcfieldsFromFieldsStr($params->get('item_fields_for_marker', ''));

            if ($params->get('article_marker_view') === 'media')
            {
                $fieldIds[] = (int)$params->get('article_marker_view_media_field_id');
            }
            elseif ($params->get('article_marker_view') === 'layout')
            {
                $fieldIds[] = (int)$params->get('article_marker_view_layout_field_id');
            }

            if ($params->get('article_popup_view') === 'layout')
            {
                $fieldIds[] = (int)$params->get('article_popup_view_layout_field_id');
            }

            $fieldIds[] = (int)$params->get('com_content_article_yandex_map_coords_field_id');

            $fieldIds = array_unique($fieldIds);

            $jcfields = $this->getFields($item->id, $fieldIds);

            $item->jcfields = [];
            foreach ($jcfields as $jcfield)
            {
                $item->jcfields[] = clone $jcfield;
            }
        }
        catch (Exception)
        {
            $item->jcfields = [];
        }
    }

    private function getJcfieldsFromFieldsStr($fields): array
    {
        $fields = explode(',', $fields);
        // удаляем пробельные символы (пробел, \t, \r, \n и т.д)
        $fields = array_map('trim', $fields);

        $ids = [];

        foreach ($fields as $fieldName)
        {
            if (!str_contains($fieldName, 'jcfields:'))
            {
                continue;
            }

            $array = explode(':', $fieldName);

            if (!isset($this->fieldsCache[$array[1]]))
            {
                continue;
            }

            $ids[] = $this->fieldsCache[$array[1]]->id;
        }

        return $ids;
    }

    private function filterItemFields(&$item, $fields): void
    {
        $fields = explode(',', $fields);
        // удаляем пробельные символы (пробел, \t, \r, \n и т.д)
        $fields = array_map('trim', $fields);

        $item->item = new stdClass();
        foreach ($item->itemOriginal as $key => $value)
        {
            if (in_array($key, $fields))
            {
                $item->item->$key = $value;
            }
        }

        foreach ($fields as $fieldName)
        {
            if (str_contains($fieldName, ':'))
            {
                $array = explode(':', $fieldName);

                if (!$array)
                {
                    continue;
                }

                // удаляем пробельные символы (пробел, \t, \r, \n и т.д)
                $array = array_map('trim', $array);
                $arrayName = $array[0];

                if (!isset($item->itemOriginal->$arrayName))
                {
                    continue;
                }

                foreach ($item->itemOriginal->$arrayName as $key => $value)
                {
                    // если массив jcfields, то ищем по имени поля
                    if ($arrayName === 'jcfields' && $value->name === $array[1])
                    {
                        $item->item->$arrayName[$value->name] = $value;
                    }
                    // иначе, ищем значение по ключу
                    elseif ($key === $array[1])
                    {
                        $item->item->$arrayName[$key] = $value;
                    }
                }
            }
        }
    }

    /**
     * Get com_content articles
     *
     * @param Registry $params Module parameters
     *
     * @return mixed Articles array on success or false on failure
     *
     * @since 2.0.0
     */
    private function getArticles(Registry $params): mixed
    {
        $article_catid = $params->get('article_catid', []);

        /** @var ArticlesModel $model */
        $model = $this->app->bootComponent('com_content')->getMVCFactory()->createModel('Articles', 'Site', ['ignore_request' => true]);

        // Set application parameters in model
        $appParams = $this->app->getParams();
        $model->setState('params', $appParams);

        $model->setState('list.start', 0);
        $model->setState('filter.published', ContentComponent::CONDITION_PUBLISHED);

        // Set the filters based on the module params
        $model->setState('list.limit', (int) $params->get('count', 5));

        // This module does not use tags data
        $model->setState('load_tags', false);

        // Access filter
        $access = !ComponentHelper::getParams('com_content')->get('show_noauth');
        $authorised = Access::getAuthorisedViewLevels($this->app->getIdentity()->id);
        $model->setState('filter.access', $access);

        // Category filter
        $model->setState('filter.category_id', $article_catid);

        // Filter by language
        $model->setState('filter.language', $this->app->getLanguageFilter());

        // Filter by tag
        $model->setState('filter.tag', $params->get('article_tag', []));

        $model->setState('filter.featured', 'show');

        // Check if we should trigger additional plugin events
        $triggerEvents = $params->get('article_triggerevents', 1);

        // Retrieve Content
        $items = $model->getItems();

        if (!$items)
        {
            return false;
        }

        $this->createFieldsCache();

        /** **/
        $category_marker_icons = [];
        $category_marker_layout_ids = [];
        $category_has_popup_layout = [];

        // Поиск поля макета или иконки в полях категорий
        foreach ($article_catid as $category_id)
        {
            try
            {
                /** @var array $category_fields Список полей со значениями для конкретных категорий. */
                $category_fields = FieldsHelper::getFields('com_content.categories', ['id' => $category_id], true);
            }
            catch (Exception)
            {
                continue;
            }
            // Если есть пользовательские поля
            foreach ($category_fields as $field)
            {
                // Ищем поле типа media - иконка
                if ($params->get('is_default_marker') === 0
                    && $params->get('category_marker_view') === 'media'
                    && $field->id == $params->get('category_marker_view_media_field_id')
                )
                {
                    $iconData = json_decode($field->rawvalue);

                    if ($iconData->imagefile)
                    {
                        $imgObj = HTMLHelper::cleanImageURL($iconData->imagefile);
                        unset($iconData->imagefile);

                        $iconData = (object) array_merge((array)$iconData, (array)$imgObj);

                        $category_marker_icons[$category_id] = $iconData;
                    }
                }
                // Ищем поле типа text - id макета
                elseif ($params->get('is_default_marker') === 0
                    && $params->get('category_marker_view') === 'layout'
                    && $field->id == $params->get('category_marker_view_layout_field_id')
                )
                {
                    if ($field->rawvalue)
                    {
                        $marker_layout_id = is_array($field->rawvalue) ? $field->rawvalue[0] : trim($field->rawvalue);
                        $category_marker_layout_ids[$category_id] = $marker_layout_id;
                    }
                }
                // Ищем поле типа text - есть ли popup макета
                elseif ($params->get('use_popup') === 'custom'
                    && $params->get('category_popup_view') === 'layout'
                    && $field->id == $params->get('category_popup_view_layout_field_id')
                )
                {
                    $category_has_popup_layout[$category_id] = (bool)$field->rawvalue;
                }
                elseif ($params->get('use_popup') === 'custom'
                    && $params->get('category_popup_view') === 'default'
                )
                {
                    $category_has_popup_layout[$category_id] = true;
                }
            }
        }

        /**
         * Подключаем файл с языковыми константами
         */
        $lang = $this->app->getLanguage();
        $extension = 'com_content';
        $base_dir = JPATH_SITE;
        $reload = true;
        $lang->load($extension, $base_dir, $lang->getTag(), $reload);

        foreach ($items as $i => &$item)
        {
            $this->addItemProperties($item, $access, $authorised);

            if ($triggerEvents)
            {
                $this->itemTriggerEvents($item);
            }

            // Try insert fields in $item
            $this->addItemJcfields($item, $params);

            // Convert images string to json array
            $item->images = json_decode($item->images);

            if ($item->images->image_intro)
            {
                $imgObj = HTMLHelper::cleanImageURL($item->images->image_intro);
                $item->images->image_intro = $imgObj;
            }

            if ($item->images->image_fulltext)
            {
                $imgObj = HTMLHelper::cleanImageURL($item->images->image_fulltext);
                $item->images->image_fulltext = $imgObj;
            }

            // Если нет пользовательских полей
            if (is_countable($item->jcfields) === false)
            {
                // Пропускаем материал
                unset($items[$i]);
                continue;
            }

            $item->itemOriginal = new stdClass();
            foreach ($item as $key => $value)
            {
                if ($key != 'itemOriginal')
                {
                    $item->itemOriginal->$key = $value;
                    unset($item->$key);
                }
            }

            $catid = $item->itemOriginal->catid;

            // Получение из категории материала - иконка
            if (!empty($category_marker_icons[$catid]))
            {
                $item->icon = $category_marker_icons[$catid];
            }

            // Получение из категории материала - id макета
            if (!empty($category_marker_layout_ids[$catid]))
            {
                $item->marker_layout_id = $category_marker_layout_ids[$catid];
            }

            // Получение из категории материала - есть ли popup макет
            if (!empty($category_has_popup_layout[$catid]))
            {
                $item->has_popup = $category_has_popup_layout[$catid];
            }

            if ($params->get('is_default_marker') === 0
                && $params->get('article_marker_view') === 'media'
            )
            {
                if ($params->get('article_marker_view_media_from') === 'intro')
                {
                    if ($item->itemOriginal->images->image_intro)
                    {
                        // Тип свойства image_intro - объект, поэтому клонируем его
                        // для возможности изменять свойство icon не затрагивая оригинальное свойство
                        $item->icon = clone $item->itemOriginal->images->image_intro;
                        $item->icon->alt_text = $item->itemOriginal->images->image_intro_alt;
                    }
                }
                elseif ($params->get('article_marker_view_media_from') === 'fulltext')
                {
                    if ($item->itemOriginal->images->image_fulltext)
                    {
                        // Тип свойства image_intro - объект, поэтому клонируем его
                        // для возможности изменять свойство icon не затрагивая оригинальное свойство
                        $item->icon = clone $item->itemOriginal->images->image_fulltext;
                        $item->icon->alt_text = $item->itemOriginal->images->image_fulltext_alt;
                    }
                }
            }

            foreach ($item->itemOriginal->jcfields as $field)
            {
                // Ищем поле - координаты
                if ($field->id == $params->get('com_content_article_yandex_map_coords_field_id'))
                {
                    $coords = explode(',', $field->rawvalue);
                    foreach ($coords as &$coord)
                    {
                        $coord = (float)trim($coord);
                    }
                    $item->geometry = new stdClass();
                    $item->geometry->coordinates = $coords;
                }

                // Ищем поле типа media - иконка
                if ($params->get('is_default_marker') === 0
                    && $params->get('article_marker_view') === 'media'
                    && $params->get('article_marker_view_media_from') === 'field'
                    && $field->id == $params->get('article_marker_view_media_field_id')
                )
                {
                    if ($field->rawvalue->url)
                    {
                        $item->icon = $field->rawvalue;
                    }
                }
                // Ищем поле типа text - id макета
                elseif ($params->get('is_default_marker') === 0
                    && $params->get('article_marker_view') === 'layout'
                    && $field->id == $params->get('article_marker_view_layout_field_id')
                )
                {
                    if ($field->rawvalue)
                    {
                        $item->marker_layout_id = $field->rawvalue;
                    }
                }
                // Ищем поле типа text - есть ли popup макета
                elseif ($params->get('use_popup') === 'custom'
                    && $params->get('article_popup_view') === 'layout'
                    && $field->id == $params->get('article_popup_view_layout_field_id')
                )
                {
                    if ($field->rawvalue)
                    {
                        $item->has_popup = true;
                    }
                }
                elseif ($params->get('use_popup') === 'default' || ($params->get('use_popup') === 'custom' && $params->get('article_popup_view') === 'default'))
                {
                    $item->has_popup = true;
                }
            }

            // Если нет координат или значение неверного формата
            if (empty($item->geometry->coordinates) || count($item->geometry->coordinates) != 2)
            {
                // Пропускаем материал
                unset($items[$i]);
                continue;
            }

            $item->id = $item->itemOriginal->id;

            $this->filterItemFields($item, $params->get('item_fields_for_marker', ''));

            unset($item->itemOriginal);
        }

        // re-indexing an array after possible unsetting of any element
        return array_values($items);
    }

    /**
     * Get item data from article id
     *
     * @param int $id Article id
     *
     * @return stdClass
     *
     * @since 2.0.0
     */
    public function getItem(int $id): stdClass
    {
        $params = $this->params;
        $popupData = new stdClass();

        $article = $this->getArticle($id, $params);

        if (!$article)
        {
            return $popupData;
        }

        $category_id = $article->catid;

        $category_fields = [];
        try
        {
            $category_fields = FieldsHelper::getFields('com_content.categories', ['id' => $category_id], true);
        }
        catch (Exception)
        {
            // Exception
        }


        $popupData->popup_layout_id = 'modules.mod_wtyandexmapitems.popup.default';

        // Поиск в полях категории
        if ($params->get('use_popup') === 'custom'
            && $params->get('category_popup_view') === 'layout') {

            foreach ($category_fields as $field)
            {
                // Ищем поле типа text - id макета popup
                if ($field->id == (int)$params->get('category_popup_view_layout_field_id') && !empty($field->rawvalue))
                {
                    $popup_layout_id = is_array($field->rawvalue) ? $field->rawvalue[0] : trim($field->rawvalue);
                    if(!empty($popup_layout_id)) {
                        $popupData->popup_layout_id = $popup_layout_id;
                    }

                }
            }
        }


        // Ищем поле типа text - id макета popup
        // Поиск в полях материала
        foreach ($article->jcfields as $field)
        {
            // Ищем поле типа text - id макета popup
            if ($params->get('use_popup') === 'custom'
                && $params->get('article_popup_view') === 'layout'
                && $field->id == $params->get('article_popup_view_layout_field_id')
                && !empty($field->rawvalue))
            {
                $popup_layout_id = is_array($field->rawvalue) ? $field->rawvalue[0] : trim($field->rawvalue);
                if(!empty($popup_layout_id)) {
                    $popupData->popup_layout_id = $popup_layout_id;
                }
            }
        }

        $popupData->itemOriginal = $article;
        $this->filterItemFields($popupData, $params->get('item_fields_for_popup', ''));

        unset($popupData->itemOriginal);

        return $popupData;
    }
}