<?php
/**
 * @package       WT Yandex map items
 * @version    2.0.0
 * @author     Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2025 Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link       https://web-tolk.ru
 * @since      1.0.0
 */

namespace Joomla\Module\Wtyandexmapitems\Site\Helper;

use Joomla\CMS\Application\CMSApplication;
use Joomla\CMS\Factory;
use Joomla\CMS\Helper\ModuleHelper;
use Joomla\CMS\Layout\FileLayout;
use Joomla\CMS\Response\JsonResponse;
use Joomla\Database\DatabaseInterface;
use Joomla\Module\Wtyandexmapitems\Site\Driver\AbstractDriver;
use Joomla\Registry\Registry;
use Joomla\Module\Wtyandexmapitems\Site\Driver\DriverFactory;
use stdClass;
use function defined;

defined('_JEXEC') or die;

/**
 * Helper for mod_wtyandexmapitems
 *
 * @since  1.0
 */
class WtyandexmapitemsHelper
{
    private AbstractDriver $driverInstance;

	public function getAjax(): string
	{
		$app = Factory::getApplication();
		if ($module_id = $app->getInput()->get('module_id'))
		{
			$module = ModuleHelper::getModuleById($module_id);
			if ($module->module != 'mod_wtyandexmapitems')
			{
				return new JsonResponse('', 'Module with specified module_id is not a mod_wtyandexmapitems type',true);
			}
		}
		else
		{
			$module = ModuleHelper::getModule('wtyandexmapitems');
		}

		$module_params = new Registry($module->params);

		$item_id = $app->getInput()->getInt('id', -1);

		if ($item_id >= 0)
		{
			return new JsonResponse($this->getMarker($item_id, $module_params, $app));
		}

		return new JsonResponse($this->getMarkers($module_params, $app));
	}

	/**
	 * @param $params
	 * @param $app
	 *
	 * @return array
	 *
	 *
	 * @since 2.0.0
	 */
	public function getMarkers($params, $app): array
	{
        return $this->getDriver($params->get('data_source', 'com_content.article'), $params, $app)->getItems();
	}

	/**
	 * Get item data for popup window on map
	 *
	 * @param int $id
	 * @param Registry $params
	 * @param CMSApplication $app
	 *
	 * @return array
	 *
	 * @since 2.0.0
	 */
	public function getMarker($id, $params, $app): stdClass
    {
        return $this->getDriver($params->get('data_source', 'com_content.article'), $params, $app)->getItem($id);
    }

    /**
     * Формирует массив макетов для маркеров или всплывающих окон
     *
     * @param string $context
     * @param Registry $params
     *
     * @return array
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
     * Получаем объект драйвера
     *
	 * @param $context
	 * @param $params
	 * @param $app
	 *
	 * @return AbstractDriver|bool
	 * @since 2.0.0
	 */
	public function getDriver($context, $params, $app): AbstractDriver|bool
	{
        if (empty($this->driverInstance))
        {
            $this->driverInstance = DriverFactory::getDriver($context, $params, $app);
        }

		return $this->driverInstance;
	}

}
