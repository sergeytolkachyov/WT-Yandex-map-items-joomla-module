<?php
// No direct access to this file
defined('_JEXEC') or die('Restricted access');
use Joomla\CMS\Factory;
use Joomla\CMS\Installer\Installer;
use Joomla\CMS\Installer\InstallerHelper;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Plugin\PluginHelper;

/**
 * Script file of HelloWorld component.
 *
 * The name of this class is dependent on the component being installed.
 * The class name should have the component's name, directly followed by
 * the text InstallerScript (ex:. com_helloWorldInstallerScript).
 *
 * This class will be called by Joomla!'s installer, if specified in your component's
 * manifest file, and is used for custom automation actions in its installation process.
 *
 * In order to use this automation script, you should reference it in your component's
 * manifest file as follows:
 * <scriptfile>script.php</scriptfile>
 *
 * @package     Joomla.Administrator
 * @subpackage  com_helloworld
 *
 * @copyright   Copyright (C) 2005 - 2018 Open Source Matters, Inc. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */
class mod_wtyandexmapitemsInstallerScript
{
    /**
     * This method is called after a component is installed.
     *
     * @param  \stdClass $parent - Parent object calling this method.
     *
     * @return void
     */
    public function install($parent)
    {

    }

    /**
     * This method is called after a component is uninstalled.
     *
     * @param  \stdClass $parent - Parent object calling this method.
     *
     * @return void
     */
    public function uninstall($parent) 
    {

		
    }

    /**
     * This method is called after a component is updated.
     *
     * @param  \stdClass $parent - Parent object calling object.
     *
     * @return void
     */
    public function update($parent) 
    {

    }

    /**
     * Runs just before any installation action is performed on the component.
     * Verifications and pre-requisites should run in this function.
     *
     * @param  string    $type   - Type of PreFlight action. Possible values are:
     *                           - * install
     *                           - * update
     *                           - * discover_install
     * @param  \stdClass $parent - Parent object calling object.
     *
     * @return void
     */
    public function preflight($type, $parent) 
    {

    }
	/**
	 * @param $parent
	 *
	 * @return bool
	 * @throws Exception
	 *
	 *
	 * @since 1.0.0
	 */
	protected function installDependencies($parent,$url)
	{
		// Load installer plugins for assistance if required:
		PluginHelper::importPlugin('installer');

		$app = Factory::getApplication();

		$package = null;

		// This event allows an input pre-treatment, a custom pre-packing or custom installation.
		// (e.g. from a JSON description).
		$results = $app->triggerEvent('onInstallerBeforeInstallation', array($this, &$package));

		if (in_array(true, $results, true))
		{
			return true;
		}

		if (in_array(false, $results, true))
		{
			return false;
		}



		// Download the package at the URL given.
		$p_file = InstallerHelper::downloadPackage($url);

		// Was the package downloaded?
		if (!$p_file)
		{
			$app->enqueueMessage(Text::_('COM_INSTALLER_MSG_INSTALL_INVALID_URL'), 'error');

			return false;
		}

		$config   = Factory::getConfig();
		$tmp_dest = $config->get('tmp_path');

		// Unpack the downloaded package file.
		$package = InstallerHelper::unpack($tmp_dest . '/' . $p_file, true);

		// This event allows a custom installation of the package or a customization of the package:
		$results = $app->triggerEvent('onInstallerBeforeInstaller', array($this, &$package));

		if (in_array(true, $results, true))
		{
			return true;
		}

		if (in_array(false, $results, true))
		{
			InstallerHelper::cleanupInstall($package['packagefile'], $package['extractdir']);

			return false;
		}

		// Get an installer instance.
		$installer = new Installer();

		/*
		 * Check for a Joomla core package.
		 * To do this we need to set the source path to find the manifest (the same first step as JInstaller::install())
		 *
		 * This must be done before the unpacked check because JInstallerHelper::detectType() returns a boolean false since the manifest
		 * can't be found in the expected location.
		 */
		if (is_array($package) && isset($package['dir']) && is_dir($package['dir']))
		{
			$installer->setPath('source', $package['dir']);

			if (!$installer->findManifest())
			{
				InstallerHelper::cleanupInstall($package['packagefile'], $package['extractdir']);
				$app->enqueueMessage(Text::sprintf('COM_INSTALLER_INSTALL_ERROR', '.'), 'warning');

				return false;
			}
		}

		// Was the package unpacked?
		if (!$package || !$package['type'])
		{
			InstallerHelper::cleanupInstall($package['packagefile'], $package['extractdir']);
			$app->enqueueMessage(Text::_('COM_INSTALLER_UNABLE_TO_FIND_INSTALL_PACKAGE'), 'error');

			return false;
		}

		// Install the package.
		if (!$installer->install($package['dir']))
		{
			// There was an error installing the package.
			$msg     = Text::sprintf('COM_INSTALLER_INSTALL_ERROR',
				Text::_('COM_INSTALLER_TYPE_TYPE_' . strtoupper($package['type'])));
			$result  = false;
			$msgType = 'error';
		}
		else
		{
			// Package installed successfully.
			$msg     = Text::sprintf('COM_INSTALLER_INSTALL_SUCCESS',
				Text::_('COM_INSTALLER_TYPE_TYPE_' . strtoupper($package['type'])));
			$result  = true;
			$msgType = 'message';
		}

		// This event allows a custom a post-flight:
		$app->triggerEvent('onInstallerAfterInstaller', array($parent, &$package, $installer, &$result, &$msg));

		$app->enqueueMessage($msg, $msgType);

		// Cleanup the install files.
		if (!is_file($package['packagefile']))
		{
			$package['packagefile'] = $config->get('tmp_path') . '/' . $package['packagefile'];
		}

		InstallerHelper::cleanupInstall($package['packagefile'], $package['extractdir']);

		return $result;
	}


	/**
     * Runs right after any installation action is performed on the component.
     *
     * @param  string    $type   - Type of PostFlight action. Possible values are:
     *                           - * install
     *                           - * update
     *                           - * discover_install
     * @param  \stdClass $installer - Parent object calling object.
     *
     * @return void
     */
    function postflight($type, $installer) 
    {
		 $smile = '';
	    if($type != 'uninstall')
	    {
		    $smiles    = ['&#9786;', '&#128512;', '&#128521;', '&#128525;', '&#128526;', '&#128522;', '&#128591;'];
		    $smile_key = array_rand($smiles, 1);
		    $smile     = $smiles[$smile_key];
	    }
		
		$element = strtoupper($installer->getElement());

		echo "
		<div class='row bg-white m-3 p-3 shadow-sm border'>
		<div class='col-8'>
		<h2>".$smile." ".Text::_($element."_AFTER_".$type)." <br/>".Text::_($element)."</h2>
		".Text::_($element."_DESC");
		
		echo Text::_($element."_WHATS_NEW");

		echo "</div>
		<div class='col-4 d-flex flex-column justify-content-center'>
		<img width='200px' src='https://web-tolk.ru/web_tolk_logo_wide.png'>
		<p>Joomla Extensions</p>
		<p class='btn-group'>
			<a class='btn btn-sm btn-outline-primary' href='https://web-tolk.ru' target='_blank'>https://web-tolk.ru</a>
			<a class='btn btn-sm btn-outline-primary' href='mailto:info@web-tolk.ru'><i class='icon-envelope'></i> info@web-tolk.ru</a>
		</p>
		<p><a class='btn btn-info' href='https://t.me/joomlaru' target='_blank'>Joomla Russian Community in Telegram</a></p>
		".Text::_($element."_MAYBE_INTERESTING")."
		</div>

		";	
	
    }
}