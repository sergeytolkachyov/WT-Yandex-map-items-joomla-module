<?php
/**
 * @package         WT Yandex Map items
 *
 * @copyright   (C) 2022 Sergey Tolkachyov
 * @link            https://web-tolk.ru
 * @license         GNU General Public License version 2 or later
 */

namespace Joomla\Module\Wtyandexmapitems\Site\Helper;

use Joomla\CMS\Access\Access;
use Joomla\CMS\Component\ComponentHelper;
use Joomla\CMS\Factory;
use Joomla\CMS\Helper\ModuleHelper;
use Joomla\CMS\HTML\HTMLHelper;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Layout\FileLayout;
use Joomla\CMS\Router\Route;
use Joomla\CMS\Uri\Uri;
use Joomla\Component\Content\Site\Helper\RouteHelper;
use Joomla\Component\Fields\Administrator\Helper\FieldsHelper;
use Joomla\Registry\Registry;

\defined('_JEXEC') or die;


/**
 * Helper for mod_wtyandexmapitems
 *
 * @since  1.0
 */
class WtyandexmapitemsHelper
{
	public function getPlacemarks($params, $app):array
	{

		$context = $params->get('data_source', 'com_content.article');


		$placemarks = [
			'type'     => 'FeatureCollection',
			'features' => []
		];

		if ($context == 'com_content.article')
		{
			$placemarks["features"] = $this->getPlacemarksFromContentArticles($params, $app);

		}

		return $placemarks;
	}

	public function getAjax():string
	{
		$app = Factory::getApplication();
		if ($app->getInput()->get('module_id'))
		{

			$module = ModuleHelper::getModuleById($app->getInput()->get('module_id'));

			if ($module->module != 'mod_wtyandexmapitems')
			{

				return json_encode(['error' => 'Module with specified module_id is not a mod_wtyandexmapitems type']);

			}

		}
		else
		{
			$module = ModuleHelper::getModule('wtyandexmapitems');
		}

		$module_params = new Registry($module->params);

		return json_encode($this->getPlacemarks($module_params, $app));
	}

	public function getContentArticles($params, $app)
	{

		/** @var \Joomla\Component\Content\Site\Model\ArticlesModel $model */
		$model = $app->bootComponent('com_content')
			->getMVCFactory()->createModel('Articles', 'Site', ['ignore_request' => true]);

		// Set application parameters in model
		$appParams = $app->getParams();
		$model->setState('params', $appParams);

		$model->setState('list.start', 0);
		$model->setState('filter.published', 1);

		// Set the filters based on the module params
		$model->setState('list.limit', (int) $params->get('count', 5));

		// This module does not use tags data
		$model->setState('load_tags', false);

		// Access filter
		$access     = !ComponentHelper::getParams('com_content')->get('show_noauth');
		$authorised = Access::getAuthorisedViewLevels(Factory::getApplication()->getIdentity()->get('id'));
		$model->setState('filter.access', $access);

		// Category filter
		$model->setState('filter.category_id', $params->get('article_catid', array()));

		// Filter by language
		$model->setState('filter.language', $app->getLanguageFilter());

		// Filter by tag
		$model->setState('filter.tag', $params->get('article_tag', array()));

		$model->setState('filter.featured', 'show');

		// Check if we should trigger additional plugin events
		$triggerEvents = $params->get('article_triggerevents', 1);

		// Retrieve Content
		$items = $model->getItems();

		/**
		 * Подключаем файл с языковыми константами для вывода "дней" в падежах
		 */
		$lang         = Factory::getApplication()->getLanguage();
		$extension    = 'com_content';
		$base_dir     = JPATH_SITE;
		$reload       = true;
		$lang->load($extension, $base_dir, $lang->getTag(), $reload);

		foreach ($items as &$item)
		{
			$item->readmore = \strlen(trim($item->fulltext));
			$item->slug     = $item->id . ':' . $item->alias;

			if ($access || \in_array($item->access, $authorised))
			{
				// We know that user has the privilege to view the article
				$item->link     = Route::_(RouteHelper::getArticleRoute($item->slug, $item->catid, $item->language));
				$item->linkText = Text::_('COM_CONTENT_READ_MORE');
			}
			else
			{
				$item->link = new Uri(Route::_('index.php?option=com_users&view=login', false));
				$item->link->setVar('return', base64_encode(RouteHelper::getArticleRoute($item->slug, $item->catid, $item->language)));
				$item->linkText = Text::_('COM_CONTENT_REGISTER_TO_READ_MORE');
			}
			$item->introtext = HTMLHelper::_('content.prepare', $item->introtext, '', 'mod_wtyandexmapitems.content');

			// Remove any images belongs to the text
			if (!$params->get('image'))
			{
				$item->introtext = preg_replace('/<img[^>]*>/', '', $item->introtext);
			}
			// Inserrt fields in $item
			$item->jcfields = FieldsHelper::getFields('com_content.article', $item, true);

			// Show the Intro/Full image field of the article
			if ($params->get('article_img_intro_full') !== 'none')
			{
				$images             = json_decode($item->images);
				$item->imageSrc     = '';
				$item->imageAlt     = '';
				$item->imageCaption = '';

				if ($params->get('article_img_intro_full') === 'intro' && !empty($images->image_intro))
				{
					$item->imageSrc = htmlspecialchars($images->image_intro, ENT_COMPAT, 'UTF-8');
					$item->imageAlt = htmlspecialchars($images->image_intro_alt, ENT_COMPAT, 'UTF-8');

					if ($images->image_intro_caption)
					{
						$item->imageCaption = htmlspecialchars($images->image_intro_caption, ENT_COMPAT, 'UTF-8');
					}
				}
				elseif ($params->get('article_img_intro_full') === 'full' && !empty($images->image_fulltext))
				{
					$item->imageSrc = htmlspecialchars($images->image_fulltext, ENT_COMPAT, 'UTF-8');
					$item->imageAlt = htmlspecialchars($images->image_fulltext_alt, ENT_COMPAT, 'UTF-8');

					if ($images->image_intro_caption)
					{
						$item->imageCaption = htmlspecialchars($images->image_fulltext_caption, ENT_COMPAT, 'UTF-8');
					}
				}
				elseif ($params->get('article_img_intro_full') === 'image_from_field' &&
					$params->get('com_content_article_article_baloon_image_from_field_field_id'))
				{

					foreach ($item->jcfields as $field)
					{
						if ($field->id == $params->get('com_content_article_article_baloon_image_from_field_field_id'))
						{
							if ($field->type == 'subform' && is_countable($field->subform_rows) && count($field->subform_rows) > 0)
							{

								// Проходим ряды сабформы, потом каждое поле сабформы. Берём первое поле типа media
								foreach ($field->subform_rows as $row){
									foreach ($row as $row_field){
										if($row_field->type == 'media' && empty($item->imageSrc)){
											// $image          = json_decode($row_field->rawvalue);
											// Почему то здесь приходит сразу декодированный массив
											$row_field->rawvalue = (object)$row_field->rawvalue;
											$item->imageSrc = htmlspecialchars($row_field->rawvalue->imagefile, ENT_COMPAT, 'UTF-8');
											$item->imageAlt = htmlspecialchars($row_field->rawvalue->alt_text, ENT_COMPAT, 'UTF-8');
										}
									}
								}
								// 1-е изображение
							}
							else
							{
								// Одна картинка
								$image          = json_decode($field->rawvalue);
								$item->imageSrc = htmlspecialchars($image->imagefile, ENT_COMPAT, 'UTF-8');
								$item->imageAlt = htmlspecialchars($image->alt_text, ENT_COMPAT, 'UTF-8');
							}

						}
					}
				}
			}

			if ($triggerEvents)
			{
				$item->text = '';
				$app->triggerEvent('onContentPrepare', array('com_content.article', &$item, &$params, 0));

				$results                 = $app->triggerEvent('onContentAfterTitle', array('com_content.article', &$item, &$params, 0));
				$item->afterDisplayTitle = trim(implode("\n", $results));

				$results                    = $app->triggerEvent('onContentBeforeDisplay', array('com_content.article', &$item, &$params, 0));
				$item->beforeDisplayContent = trim(implode("\n", $results));

				$results                   = $app->triggerEvent('onContentAfterDisplay', array('com_content.article', &$item, &$params, 0));
				$item->afterDisplayContent = trim(implode("\n", $results));
			}
			else
			{
				$item->afterDisplayTitle    = '';
				$item->beforeDisplayContent = '';
				$item->afterDisplayContent  = '';
			}

		}

		return $items;
	}

	/**
	 * Собираем из материалов массив с метками.
	 * @param $params
	 * @param $app
	 *
	 * @return array Массив меток
	 *
	 * @since 1.0.0
	 */
	public function getPlacemarksFromContentArticles($params, $app){

		$items = $this->getContentArticles($params, $app);
		$placemarks = [];
		$placemark_coords = [];
		foreach ($items as $article)
		{

			if (is_countable($article->jcfields))
			{
				foreach ($article->jcfields as $field)
				{
					if ($field->id == $params->get('com_content_article_yandex_map_coords_field_id'))
					{
						$placemark_coords = explode(',', $field->rawvalue);
						if ($field->type == 'wtyandexmap')
						{
							$fieldParams         = $field->fieldparams;
							$placemark_icon_code = $fieldParams->get('placemark_icon_code');
							$map_center          = $fieldParams->get('map_center');
						}
					}
				}
			}
			else
			{
				// Полей нет вообще
				continue;
			}
			// У нас есть пара координат
			if (count($placemark_coords) == 2)
			{

				$placemark = [
					'type'     => 'Feature',
					'id'       => $article->id,
					'geometry' => [
						'type'        => 'Point',
						'coordinates' => $placemark_coords,

					]
				];

				// Показывать или нет заголовок матерала в метке
				if ($params->get('show_article_title', '1') == 1)
				{
					$placemark['properties']['balloonContentHeader'] = $article->title;
					$placemark['properties']['hintContent']          = $article->title;
				}

				// Показывать или нет текст материала в метке и какой именно

				if ($params->get('article_baloon_text', 'fulltext') == 'fulltext')
				{
					$balloonContentBody = $article->fulltext;
				}
				elseif ($params->get('article_baloon_text', 'fulltext') == 'introtext')
				{
					$balloonContentBody = $article->introtext;
				}
				elseif ($params->get('article_baloon_text', 'fulltext') == 'text_from_field')
				{
					foreach ($article->jcfields as $field)
					{
						if ($params->get('com_content_article_article_baloon_text_from_field_field_id') &&
							$field->id == $params->get('com_content_article_article_baloon_text_from_field_field_id'))
						{

							$balloonContentBody = [
								'title' => $field->title,
								'text'  => $field->value
							];
						}
					}
				}
				else
				{
					$balloonContentBody = '';
				}
				$layout = new FileLayout($params->get('balloonContentBody_layout','default_balloonContentBody'), JPATH_SITE . '/modules/mod_wtyandexmapitems/tmpl/sublayouts');

				$displayData = [
					'data'          => $balloonContentBody,
					'module_params' => $params,
					'image' => [
						'imageSrc' => $article->imageSrc,
						'imageAlt' => $article->imageAlt,
					],
					'link' => $article->link,
					'link_text' => $article->linkText
				];
				$placemark['properties']['balloonContentBody'] = $layout->render($displayData);
				//$placemark['properties']['balloonContentFooter'] = "";

				if ($placemark_icon_code)
				{
					$placemark["options"]["preset"] = $placemark_icon_code;
				}
			}
			else
			{
				continue;
			}
			$placemarks[] = $placemark;

		} // foreach ($items as $article)
		return $placemarks;
	}
}
