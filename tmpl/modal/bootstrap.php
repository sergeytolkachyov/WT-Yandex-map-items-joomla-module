<?php
/**
 * @package       WT Yandex map items
 * @version    2.0.5
 * @author        Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2025 Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link          https://web-tolk.ru
 * @since      2.0.0
 */

use Joomla\CMS\HTML\Helpers\Bootstrap;

// No direct access to this file
defined('_JEXEC') or die;

/**
 * @var stdClass $module The module instance
 */

echo Bootstrap::renderModal('popup-modal-' . $module->id, [
    'title' => '',
    'closeButton' => true,
    'height' => '100%',
    'width' => '100%'
]);