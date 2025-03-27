<?php
/**
 * @package       WT Yandex map items
 * @version    2.0.0
 * @author     Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2025 Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link       https://web-tolk.ru
 * @since      2.0.0
 */

namespace Joomla\Module\Wtyandexmapitems\Site\Driver;

use Joomla\CMS\Application\CMSApplicationInterface;
use Joomla\Registry\Registry;
use function class_exists;
use function defined;
use function explode;
use function implode;
use function str_contains;
use function str_replace;

// no direct access
defined('_JEXEC') or die;

class DriverFactory
{
	/**
	 * Method to create a Driver instance.
	 *
	 * @param string                  $context
	 * @param Registry                $params  Current WT Yandex map items instanse module params
     * @param CMSApplicationInterface $app     Current application instance
	 *
	 * @return AbstractDriver|bool
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
		$parts    = array_map('ucfirst', $parts);

		$class_name = __NAMESPACE__ . '\\Collection\\' . implode($parts) . 'Driver';
		// Check class for driver
		if (!class_exists($class_name))
		{
			return false;
		}

        return new $class_name($context, $params, $app);
	}
}
