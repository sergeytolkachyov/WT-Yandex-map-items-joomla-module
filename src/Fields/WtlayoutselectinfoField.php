<?php
/**
 * @package       WT Yandex map items
 * @version    2.3.1
 * @author     Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2026 WebTolk, Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link          https://web-tolk.ru
 * @since      2.3.1
 */

namespace Joomla\Module\Wtyandexmapitems\Site\Fields;

use Joomla\CMS\Extension\ExtensionHelper;
use Joomla\CMS\Form\Field\SpacerField;
use Joomla\CMS\Form\FormHelper;
use Joomla\CMS\Language\Text;

// No direct access to this file
\defined('_JEXEC') or die;

FormHelper::loadFieldClass('spacer');

class WtlayoutselectinfoField extends SpacerField
{
	protected $type = 'Wtlayoutselectinfo';

	/**
	 * Method to get the field input markup for a spacer.
	 *
	 * @return string The field input markup.
	 *
	 * @since 2.3.1
	 */
	protected function getInput(): string
	{
		return ' ';
	}

	/**
	 * Method to get the field title.
	 *
	 * @return string The field title.
	 *
	 * @since 2.3.1
	 */
	protected function getTitle(): string
	{
		return $this->getLabel();
	}

	/**
	 * @return string The field label markup.
	 *
	 * @since 2.3.1
	 */
	protected function getLabel(): string
	{
		if (!$this->isWtLayoutSelectPluginInstalled())
		{
			return '';
		}

		return '
        </div>
		<div class="row g-0 w-100 mt-3">
			<div class="col-12">
				<div class="alert alert-info mb-0 wtyandexmapitems-wtlayoutselect-info">
					' . Text::_('MOD_WTYANDEXMAPITEMS_WTLAYOUTSELECT_INSTALLED_INFO') . '
				</div>
			</div>
		</div>
		<div>
		';
	}

	/**
	 * @return bool True when the WT Layout Select custom field plugin is installed.
	 *
	 * @since 2.3.1
	 */
	private function isWtLayoutSelectPluginInstalled(): bool
	{
		return ExtensionHelper::getExtensionRecord('wtlayoutselect', 'plugin', null, 'fields') !== null;
	}
}
