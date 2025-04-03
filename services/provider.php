<?php
/**
 * @package    WT Yandex map items
 * @version    2.0.1
 * @author     Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2025 Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link       https://web-tolk.ru
 * @since      1.0.0
 */

use Joomla\CMS\Extension\Service\Provider\HelperFactory;
use Joomla\CMS\Extension\Service\Provider\Module;
use Joomla\CMS\Extension\Service\Provider\ModuleDispatcherFactory;
use Joomla\DI\Container;
use Joomla\DI\ServiceProviderInterface;

// No direct access to this file
defined('_JEXEC') or die;

/**
 * The "wt yandex map items" module service provider
 *
 * @since 1.0.0
 */
return new class implements ServiceProviderInterface
{
	/**
	 * Registers the service provider with a DI container
	 *
	 * @param Container $container The DI container
	 *
	 * @return void
	 *
	 * @since 1.0.0
	 */
	public function register(Container $container): void
	{
		$container->registerServiceProvider(new ModuleDispatcherFactory('\\Joomla\\Module\\Wtyandexmapitems'));
		$container->registerServiceProvider(new HelperFactory('\\Joomla\\Module\\Wtyandexmapitems\\Site\\Helper'));
		$container->registerServiceProvider(new Module);
	}
};
