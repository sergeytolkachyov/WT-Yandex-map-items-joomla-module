<?php
/**
 * @package       WT Yandex map items
 * @version    2.0.5
 * @author        Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2025 Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link          https://web-tolk.ru
 * @since      1.0.0
 */

namespace Joomla\Module\Wtyandexmapitems\Site\Dispatcher;

use Joomla\CMS\Dispatcher\AbstractModuleDispatcher;
use Joomla\Module\Wtyandexmapitems\Site\Helper\WtyandexmapitemsHelper;

// No direct access to this file
defined('_JEXEC') or die;

/**
 * Dispatcher class for "wt yandex map items" module
 *
 * @since 1.0.0
 */
class Dispatcher extends AbstractModuleDispatcher
{

	/**
	 * Returns the layout data
	 *
	 * @return array Layout data
	 *
	 * @since 1.0.0
	 */
	protected function getLayoutData(): array
	{
		$data = parent::getLayoutData();
		$context = $data['params']->get('data_source', 'com_content.article');

        $helper = new WtyandexmapitemsHelper();
        $data['layouts'] = $helper->getLayouts($context, $data['params']);

		return $data;
	}
}
