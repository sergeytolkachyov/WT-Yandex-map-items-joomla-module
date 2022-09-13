<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  mod_quickicon
 *
 * @copyright   (C) 2018 Open Source Matters, Inc. <https://www.joomla.org>
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

namespace Joomla\Module\Wtyandexmapitems\Site\Dispatcher;

\defined('JPATH_PLATFORM') or die;

use Joomla\CMS\Application\CMSApplicationInterface;
use Joomla\CMS\Dispatcher\AbstractModuleDispatcher;
use Joomla\CMS\Extension\ModuleInterface;
use Joomla\Input\Input;
use Joomla\Module\Wtyandexmapitems\Site\Helper\WtyandexmapitemsHelper;
use Joomla\Registry\Registry;

/**
 * Dispatcher class for mod_wtyandexmapitems
 *
 * @since  4.0.0
 */
class Dispatcher extends AbstractModuleDispatcher
{

	/**
	 * The module extension. Used to fetch the module helper.
	 *
	 * @var   ModuleInterface|null
	 * @since 3.0.9
	 */
	private $moduleExtension;


	public function __construct(\stdClass $module, CMSApplicationInterface $app, Input $input)
	{
		parent::__construct($module, $app, $input);

		$this->moduleExtension = $this->app->bootModule('mod_wtyandexmapitems', 'site');
	}

	/**
	 * Returns the layout data.
	 *
	 * @return  array
	 *
	 * @since   4.0.0
	 */
	protected function getLayoutData()
	{
		$data = parent::getLayoutData();

		$data['placemarks'] = (new WtyandexmapitemsHelper)->getPlacemarks($data['params'], $this->getApplication());

		return $data;
	}
}
