<?php
/**
 * @package         WT Yandex Map items
 *
 * @copyright   (C) 2022 Sergey Tolkachyov
 * @link            https://web-tolk.ru
 * @license         GNU General Public License version 2 or later
 */

use Joomla\CMS\Application\CMSApplicationInterface;
use Joomla\CMS\Factory;
use Joomla\Input\Input;
use Joomla\Registry\Registry;

defined('_JEXEC') or die;
/**
 * @var \stdClass               $module   The module
 * @var CMSApplicationInterface $app      The application instance
 * @var Input                   $input    The input instance
 * @var Registry                $params   Module params
 * @var Registry                $template Template params
 *
 * And your own vars wich you can set in your module displatcher
 * src/Dispatcher/Dispatcher.php in function getLayoutData().
 * When you return $data['your_own_variable_name'] function getLayoutData() here
 * you'll access to it via $your_own_variable_name
 */

$yandex_map_api_entry_point_free = 'https://api-maps.yandex.ru/2.1';
$yandex_map_api_entry_point_paid = 'https://enterprise.api-maps.yandex.ru/2.1';

// Получаем API ключ Яндекс.карт

if (empty($params->get('yandex_map_api_key')))
{
	$yandex_map_api_key = '';
}
else
{
	$yandex_map_api_key = 'apikey=' . $params->get('yandex_map_api_key') . '&';
}
$doc = Factory::getApplication()->getDocument();
$wa                     = $doc->getWebAssetManager();
$yandex_map_entry_point = ($params->get('yandex_api_type') == 'free' ? $yandex_map_api_entry_point_free : $yandex_map_api_entry_point_paid);
$yandex_map_script_uri  = $yandex_map_entry_point . '/?' . $yandex_map_api_key . 'lang=' . Factory::getApplication()->getLanguage()->getTag();
if(!$wa->assetExists('script','module.wtyandexmapitems.yandex') && !$wa->assetExists('script','plg.fields.wtyandexmap.yandex')){
	$wa->registerAndUseScript('module.wtyandexmapitems.yandex', $yandex_map_script_uri, [], [], ['core']);
}

/**
 * Координаты центра карты из параметров плагина
 * и координаты из поля
 */
$map_center_coords = explode(',', $params->get('map_center'));

$map_options       = array(
	'zoom'   => $params->get('map_zoom', 7),
	'type'   => 'yandex#' . $params->get('map_type', 'map'),
	'center' => explode(',',$params->get('map_center','51.533562, 46.034266'))
);


$doc->addScriptOptions('mod_wtyandexmapitems' . $module->id, $map_options);

$js_yandex_map_init = '
		ymaps.ready(init' . $module->id . ');
        function init' . $module->id . '(){
        	let mod_wtyandexmapitems' . $module->id. '_options = Joomla.getOptions("mod_wtyandexmapitems' . $module->id. '");
        	console.log(mod_wtyandexmapitems' . $module->id. '_options);
            var myMap' . $module->id . ' = new ymaps.Map("mod_wtyandexmapitems' . $module->id . '", mod_wtyandexmapitems' . $module->id. '_options ),
				objectManager = new ymaps.ObjectManager({
					// Чтобы метки начали кластеризоваться, выставляем опцию.
					clusterize: true,
					// ObjectManager принимает те же опции, что и кластеризатор.
					gridSize: 32,
					clusterDisableClickZoom: true
				});
			Joomla.request({   
				url: window.location.origin + "/index.php?option=com_ajax&module=wtyandexmapitems&format=raw",
				onSuccess: function (response, xhr){
							 if (response !== ""){
								let placemarks = JSON.parse(response);
								console.log(placemarks);
								objectManager.add(placemarks);
								myMap' . $module->id . '.geoObjects.add(objectManager);
								
						  }
					}
				});
	
			}
        ';

$wa->addInlineScript($js_yandex_map_init, [], ['defer' => true]);
?>

<div id="mod_wtyandexmapitems<?php echo $module->id; ?>" style="width:<?php echo $params->get('map_width'); ?>;height:<?php echo $params->get('map_height'); ?>;margin:0;padding:0;"></div>