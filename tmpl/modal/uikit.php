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

defined('_JEXEC') or die;

/**
 * @var stdClass $module The module instance
 */
?>
<div id="popup-modal-<?php echo $module->id; ?>" uk-modal>
    <div class="uk-modal-dialog">
        <div class="uk-modal-header">
            <h2 class="uk-modal-title"></h2>
        </div>
        <button uk-close class="uk-modal-close-default" type="button"></button>
        <div class="uk-modal-body"></div>
    </div>
</div>
