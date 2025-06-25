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

namespace Joomla\Module\Wtyandexmapitems\Site\Driver;

use Joomla\CMS\Application\CMSApplicationInterface;
use Joomla\Registry\Registry;

// No direct access to this file
defined('_JEXEC') or die;

class DriverFactory
{
	/**
	 * Method to create a driver instance
	 *
	 * @param string $context The context of driver
	 * @param Registry $params Current WT Yandex map items instance module params
     * @param CMSApplicationInterface $app Current application instance
	 *
	 * @return AbstractDriver|bool Driver instance on success or false on failure
     *
	 * @since 2.0.0
	 */
	public static function getDriver(string $context, Registry $params, CMSApplicationInterface $app): AbstractDriver|bool
	{
		if (!$context)
		{
			return false;
		}

		// Not valid context specified. without entity
		if (!str_contains($context, '.'))
		{
			return false;
		}

        // Not valid component for context specified
		$parts = explode('.', $context);
		if (!str_contains($parts[0], 'com_'))
		{
			return false;
		}

		$parts[0] = str_replace('com_', '', $parts[0]);
		$parts = array_map('ucfirst', $parts);

        // Check class for driver
		$class_name = __NAMESPACE__ . '\\Collection\\' . implode($parts) . 'Driver';
		if (!class_exists($class_name))
		{
			return false;
		}

        return new $class_name($context, $params, $app);
	}
}
