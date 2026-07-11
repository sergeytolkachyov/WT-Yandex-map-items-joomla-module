<?php
/**
 * @package       WT Yandex map items
 * @version    2.3.2
 * @author     Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2026 WebTolk, Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link          https://web-tolk.ru
 * @since      1.0.0
 */

namespace Joomla\Module\Wtyandexmapitems\Site\Helper;

use Exception;
use Joomla\CMS\Application\CMSApplicationInterface;
use Joomla\CMS\Factory;
use Joomla\CMS\Helper\ModuleHelper;
use Joomla\CMS\Layout\FileLayout;
use Joomla\CMS\Response\JsonResponse;
use Joomla\Database\DatabaseInterface;
use Joomla\Module\Wtyandexmapitems\Site\Driver\AbstractDriver;
use Joomla\Module\Wtyandexmapitems\Site\Driver\DriverFactory;
use Joomla\Module\Wtyandexmapitems\Site\Service\LayoutFieldValueResolver;
use Joomla\Registry\Registry;
use stdClass;

\defined('_JEXEC') or die;

/**
 * Helper class for "wt yandex map items" module
 *
 * @since 1.0.0
 */
class WtyandexmapitemsHelper
{
    private AbstractDriver $driverInstance;

    private ?LayoutFieldValueResolver $layoutFieldValueResolver = null;

    /**
     * Function is called by ajax request
     *
     * @return string Json response
     *
     * @throws Exception
     *
     * @since 2.0.0
     */
    public function getAjax(): string
    {
        $app = Factory::getApplication();

        if ($module_id = $app->getInput()->get('module_id'))
        {
            $module = ModuleHelper::getModuleById($module_id);
            if ($module->module !== 'mod_wtyandexmapitems')
            {
                return new JsonResponse('', 'Module with specified module_id is not a mod_wtyandexmapitems type', true);
            }
        }
        else
        {
            $module = ModuleHelper::getModule('wtyandexmapitems');
        }

        $module_params = new Registry($module->params);

        $item_id = $app->getInput()->getInt('marker_id', -1);

        if ($item_id >= 0)
        {
            return new JsonResponse($this->getMarker($item_id, $module_params, $app));
        }

        return new JsonResponse($this->getMarkers($module_params, $app));
    }

    /**
     * Get item data for markers
     *
     * @param Registry $params Module parameters
     * @param CMSApplicationInterface $app Application object
     *
     * @return array Item data for markers
     *
     * @since 2.0.0
     */
    public function getMarkers(Registry $params, CMSApplicationInterface $app): array
    {
        return $this->getDriver($params->get('data_source', 'com_content.article'), $params, $app)->getItems();
    }

    /**
     * Get item data for pop-up window on map
     *
     * @param int $id Item id
     * @param Registry $params Module parameters
     * @param CMSApplicationInterface $app Application instance
     *
     * @return stdClass Item data for pop-up window
     *
     * @since 2.0.0
     */
    public function getMarker(int $id, Registry $params, CMSApplicationInterface $app): stdClass
    {
        return $this->getDriver($params->get('data_source', 'com_content.article'), $params, $app)->getItem($id);
    }

    /**
     * Get marker and pop-up window layouts array
     *
     * @param string $context The context from module
     * @param Registry $params Module parameters
     *
     * @return array Layouts
     *
     * @since 2.0.0
     */
    public function getLayouts(string $context, Registry $params): array
    {
        $fieldIds = [];

        /**
         * Макеты маркеров. Не изображения
         */
        if ($params->get('is_default_marker') === 0) {

            if($params->get('category_marker_view') === 'layout')
            {
                $fieldIds[] = $params->get('category_marker_view_layout_field_id');
            }

            if($params->get('article_marker_view') === 'layout')
            {
                $fieldIds[] = $params->get('article_marker_view_layout_field_id');
            }
        }



        $layouts = [];
        /**
         * Пользовательские макеты всплывающих окон
         */
        if($params->get('use_popup','default') !== 'none') {
            // Макет по умолчанию добавляем всегда. Использовать для рендера, если с указанным макетом проблемы
            $layout = new FileLayout('modules.mod_wtyandexmapitems.popup.default');
            $layouts[$layout->getLayoutId()] = $layout->render(['params' => $params]);
            // Всплывающее окно категории == макет
            if($params->get('category_popup_view') === 'layout')
            {
                $fieldIds[] = $params->get('category_popup_view_layout_field_id');
            }
            // Всплывающее окно материала - макет
            if($params->get('article_popup_view') === 'layout')
            {
                $fieldIds[] = $params->get('article_popup_view_layout_field_id');
            }

        }

        $fieldIds = array_unique($fieldIds);


        if (empty($fieldIds))
        {
            return $layouts;
        }

        /** @var DatabaseInterface $db */
        $db = Factory::getContainer()->get(DatabaseInterface::class);

        /** @var DatabaseQuery $query */
        $query = $db->getQuery(true);
        $query
            ->select([
                'DISTINCT ' . $db->quoteName('fv.field_id'),
                $db->quoteName('f.type'),
                $db->quoteName('fv.value'),
            ])
            ->from($db->quoteName('#__fields_values', 'fv'))
            ->join('INNER', $db->quoteName('#__fields', 'f') . ' ON ' . $db->quoteName('f.id') . ' = ' . $db->quoteName('fv.field_id'))
            ->where($db->quoteName('fv.field_id') . ' IN(' . implode(',', array_map('intval', $fieldIds)) . ')')
            ->where($db->quoteName('fv.value') . ' IS NOT NULL')
            ->where($db->quoteName('fv.value') . ' != ' . $db->quote(''));

        $layoutNames = $db->setQuery($query)->loadObjectList();

        foreach ($layoutNames as $layoutName)
        {
            $layoutId = $this->getLayoutFieldValueResolver()->resolveFromRawValue((string) $layoutName->type, $layoutName->value);

            if ($layoutId === '')
            {
                continue;
            }

            $layout = new FileLayout($layoutId);
            $layouts[$layout->getLayoutId()] = $layout->render(['params' => $params]);
        }

        return $layouts;
    }

    /**
     * Get driver instance object
     *
     * @param string $context The context from module
     * @param Registry $params Module parameters
     * @param CMSApplicationInterface $app Application instance
     *
     * @return AbstractDriver Driver instance
     *
     * @throws Exception
     *
     * @since 2.0.0
     */
    public function getDriver(string $context, Registry $params, CMSApplicationInterface $app): AbstractDriver
    {
        if (empty($this->driverInstance))
        {
            $driver = DriverFactory::getDriver($context, $params, $app);

            if (!$driver)
            {
                throw new Exception('Failed to load driver instance.');
            }

            $this->driverInstance = $driver;
        }

        return $this->driverInstance;
    }

    /**
     * Get the layout field value resolver.
     *
     * @return LayoutFieldValueResolver
     *
     * @since 2.3.0
     */
    private function getLayoutFieldValueResolver(): LayoutFieldValueResolver
    {
        if ($this->layoutFieldValueResolver === null)
        {
            $this->layoutFieldValueResolver = new LayoutFieldValueResolver();
        }

        return $this->layoutFieldValueResolver;
    }

}
