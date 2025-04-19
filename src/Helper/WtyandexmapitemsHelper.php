<?php
/**
 * @package    WT Yandex map items
 * @version    2.0.3
 * @author     Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2025 Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link       https://web-tolk.ru
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
use Joomla\Registry\Registry;
use Joomla\Module\Wtyandexmapitems\Site\Driver\DriverFactory;
use stdClass;

defined('_JEXEC') or die;

/**
 * Helper class for "wt yandex map items" module
 *
 * @since 1.0.0
 */
class WtyandexmapitemsHelper
{
    private AbstractDriver $driverInstance;

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

        if ($params->get('is_default_marker') === 0 && $params->get('category_marker_view') === 'layout')
        {
            $fieldIds[] = $params->get('category_marker_view_layout_field_id');
        }

        if ($params->get('is_default_marker') === 0 && $params->get('article_marker_view') === 'layout')
        {
            $fieldIds[] = $params->get('article_marker_view_layout_field_id');
        }

        if ($params->get('use_popup') === 'custom' && $params->get('category_popup_view') === 'layout'
            // дополнительное условие:
            // при значении для материала default нет смысла грузить макет категории
            && $params->get('article_popup_view') !== 'default'
        )
        {
            $fieldIds[] = $params->get('category_popup_view_layout_field_id');
        }

        if ($params->get('use_popup') === 'custom' && $params->get('article_popup_view') === 'layout')
        {
            $fieldIds[] = $params->get('article_popup_view_layout_field_id');
        }

        $fieldIds = array_unique($fieldIds);

        $layouts = [];
        if ($params->get('use_popup') === 'default'
            || ($params->get('use_popup') === 'custom' && $params->get('category_popup_view') === 'default')
            || ($params->get('use_popup') === 'custom' && $params->get('article_popup_view') === 'default')
        )
        {
            $layout = new FileLayout('modules.mod_wtyandexmapitems.popup.default');
            $layouts[$layout->getLayoutId()] = $layout->render(['params' => $params]);
        }

        if (empty($fieldIds))
        {
            return $layouts;
        }

        /** @var DatabaseInterface $db */
        $db = Factory::getContainer()->get(DatabaseInterface::class);

        /** @var DatabaseQuery $query */
        $query = $db->getQuery(true);
        $query
            ->select('DISTINCT ' . $db->quoteName('value'))
            ->from($db->quoteName('#__fields_values'))
            ->where($db->quoteName('field_id') . ' IN(' . implode(',', $fieldIds) . ')');

        $layoutNames = $db->setQuery($query)->loadObjectList();

        foreach ($layoutNames as $layoutName)
        {
            $layout = new FileLayout($layoutName->value);
            $layouts[$layoutName->value] = $layout->render(['params' => $params]);
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

}
