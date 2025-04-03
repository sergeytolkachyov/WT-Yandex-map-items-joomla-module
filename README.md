[![Version](https://img.shields.io/github/v/release/sergeytolkachyov/WT-Yandex-map-items-joomla-module.svg?label=Version)]() [![Status](https://img.shields.io/badge/Status-stable-green.svg)]() [![JoomlaVersion](https://img.shields.io/badge/Joomla-4.2+-orange.svg)]() [![JoomlaVersion](https://img.shields.io/badge/Joomla-5.x-orange.svg)]() [![DocumentationRu](https://img.shields.io/badge/Documentation-ru-blueviolet.svg)](https://web-tolk.ru/dev/joomla-modules/wt-yandex-map-items?utm_source=github) [![DocumentationEng](https://img.shields.io/badge/Documentation-eng-blueviolet.svg)](https://web-tolk.ru/en/dev/joomla-modules/wt-yandex-map-items?utm_source=github) 
# WT Yandex map items Joomla module
Display data from various component's custom fields like Yandex.Maps placemarks. Joomla articles are displayed as Yandex.maps placemarks. The module is written according to the new Joomla 4+ structure.

The coordinates must be specified in the user field separated by commas. The field type is text. Or the [WT Yandex map field plugin]( https://github.com/sergeytolkachyov/Fields---WT-Yandex-map-Joomla-4-plugin)

## Plugin uses the Yandex API.Maps 3.0.
The module has switched to using the Yandex.Maps API 3.0. You will need to get an API key in Yandex developer's account, and also, possibly, specify your domain in the key parameters.

## Templating markers and pop-up window contents
You can use the standard Yandex API layouts.Maps 3.0. for both map markers and pop-up windows. But you can also create your own output layouts for each category of articles and for each Joomla article.
The parameters of the Joomla content take precedence over the parameters of the parent category. Layout paths are specified relative to the layouts folder and contain the dot symbol . instead of the slash /. For example, modules.mod_wtyandexmapitems.marker.city-marker. This approach allows you to use the Joomla redefinition mechanism and redefine layouts in your own template along the templates/[YOUR_TEMPLATE]/html/layouts/mod_wtyandexmapitems/marker/city-marker.php. To specify the marker template and/or the contents of the popup window, use a text field or a list field.

## Large number of markers
The module is optimized for displaying a large number of markers. You can display **several thousand markers** on a single map.
