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

use Joomla\CMS\Application\CMSApplicationInterface;
use Joomla\CMS\Helper\ModuleHelper;
use Joomla\Input\Input;
use Joomla\Registry\Registry;

// No direct access to this file
defined('_JEXEC') or die;

/**
 * @var stdClass $module The module instance
 * @var CMSApplicationInterface $app The application instance
 * @var Input $input The input instance
 * @var Registry $params Module params
 * @var Registry $template Template params
 * @var array $layouts Marker and pop-up layouts
 *
 * And your own vars wich you can set in your module displatcher
 * src/Dispatcher/Dispatcher.php in function getLayoutData().
 * When you return $data['your_own_variable_name'] function getLayoutData() here
 * you'll access to it via $your_own_variable_name
 */

$yandex_map_api_entry_point_free = 'https://api-maps.yandex.ru/3.0';
$yandex_map_api_entry_point_paid = 'https://enterprise.api-maps.yandex.ru/3.0';

// Получаем API ключ Яндекс.карт
$yandex_map_api_key = $params->get('yandex_map_api_key');

$yandex_map_entry_point = $params->get('yandex_api_type') === 'free' ? $yandex_map_api_entry_point_free : $yandex_map_api_entry_point_paid;
$yandex_map_script_uri = $yandex_map_entry_point . '/?apikey=' . $yandex_map_api_key . '&lang=' . str_replace('-', '_', $app->getLanguage()->getTag());

$doc = $app->getDocument();
$wa = $doc->getWebAssetManager();

if (!$wa->assetExists('script','module.wtyandexmapitems.yandex') && !$wa->assetExists('script','plg.fields.wtyandexmap.yandex'))
{
	$wa->registerAndUseScript('module.wtyandexmapitems.yandex', $yandex_map_script_uri, [], [], ['core']);
}

$wa->registerAndUseScript('module.wtyandexmapitems.script', 'mod_wtyandexmapitems/script.js', [], ['defer' => true]);

// Стиль для того, чтобы открытое всплывающее окно было поверх других маркеров
$wa->addInlineStyle("
ymaps.ymaps3x0--marker:has(> ymaps > ymaps.ymaps3x0--default-marker__popup:not(.ymaps3x0--default-marker__hider))
{
    z-index: 1 !important;
}
");

$isPopupModal = $params->get('use_popup') === 'custom' && $params->get('popup_type') === 'modal';

if ($isPopupModal)
{
    if ($params->get('popup_framework') === 'bootstrap')
    {
        $wa->useScript('bootstrap.modal');
    }
}

// Координаты центра карты из параметров плагина
$map_center_coords = explode(',', $params->get('map_center', '51.533562, 46.034266'));

foreach ($map_center_coords as &$coord)
{
    $coord = (float)trim($coord);
}

$map_options = [
	'zoom' => $params->get('map_zoom', 7),
	'type' => $params->get('map_type', 'scheme'),
    // В API 3.0 формат координат изменился, теперь это "Долгота, Широта"
	'center' => array_reverse($map_center_coords)
];

$doc->addScriptOptions('mod_wtyandexmapitems' . $module->id, $map_options);

foreach ($layouts as $id => $layout)
{
    if (empty(trim($layout)))
    {
        continue;
    }
    echo '<template id="' . $id . '">';
    echo $layout;
    echo '</template>';
}

if ($isPopupModal)
{
    if ($params->get('popup_framework') === 'bootstrap')
    {
        require ModuleHelper::getLayoutPath($module->module, 'modal/bootstrap');
    }
    else if ($params->get('popup_framework') === 'uikit')
    {
        require ModuleHelper::getLayoutPath($module->module, 'modal/uikit');
    }
}

?>
<div id="mod_wtyandexmapitems<?php echo $module->id; ?>"
     data-module-id="<?php echo $module->id; ?>"
     data-item-id="<?php echo $input->getInt('Itemid'); ?>"
     style="width: <?php echo $params->get('map_width'); ?>; height: <?php echo $params->get('map_height'); ?>; margin: 0; padding: 0;"></div>