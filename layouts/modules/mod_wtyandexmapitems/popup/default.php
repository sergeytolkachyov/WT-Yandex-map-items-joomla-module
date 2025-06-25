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

// No direct access to this file
defined('_JEXEC') or die;
?>
<div class="popupContainer">
    <img src="${item.images.image_intro.url}"
         alt="${item.images.image_intro_alt}"
         loading="lazy" style="width: 250px;">
    <h1 class="h4">${item.title}</h1>
    ${item.introtext}
    <a href="${item.link}">${item.linkText}</a>
</div>
