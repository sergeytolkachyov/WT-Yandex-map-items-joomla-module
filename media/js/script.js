/**
 * @package    WT Yandex map items
 * @version    2.0.1
 * @author     Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2025 Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link       https://web-tolk.ru
 * @since      1.0.0
 */

document.addEventListener('DOMContentLoaded', async () => {
    await ymaps3.ready;
    const {YMapDefaultMarker} = await ymaps3.import('@yandex/ymaps3-markers@0.0.1');
    const {YMapClusterer, clusterByGrid} = await ymaps3.import('@yandex/ymaps3-clusterer@0.0.1');

    let lastMarkerWithOpenedPopup = null;
    const k = 'ymaps3x0--default-marker__';

    /* кастомный класс маркера, основанный на YMapDefaultMarker */
    class YMapCustomMarker extends YMapDefaultMarker
    {
        _createContainer()
        {
            const container = super._createContainer();
            const iconBox = container.querySelector('ymaps.' + k + 'icon-box');

            // Иконка маркера - изображение
            if (this._props.icon)
            {
                const icon = document.createElement('img');
                icon.src = '/' + this._props.icon.url;
                icon.alt = this._props.icon.alt_text;
                icon.style = 'position:absolute;top:6px;left:8px;object-fit:cover;width:44px;height:44px;border-radius:50%;';
                iconBox.appendChild(icon);
            }

            // Иконка маркера - макет
            if (this._props.marker_layout_id)
            {
                const template = document.getElementById(this._props.marker_layout_id);

                if (template && template.content)
                {
                    container.innerHTML = this._processTemplate(template.innerHTML, this._props.layout_data);
                }
            }

            return container;
        }

        _processTemplate(template, templateData)
        {
            if (!templateData)
            {
                return template;
            }

            let result = '';

            // ищем "${variable}" или "${some.variable}" конструкции
            while (true)
            {
                const match = template.match(/\${\w+(?:\.[\w-]+)*}/);

                if (!match) break;

                // удаляем вначале "${" и в конце "}"
                const matchContent = match[0].substring(2, match[0].length - 1);
                // получение свойства по ключу, разделенному точками
                const props = matchContent.split('.');
                let property = templateData;
                props.forEach(prop => {
                    if (!property.hasOwnProperty(prop))
                    {
                        // если такого свойства в объекте данных нет, то возвращаем шаблон обратно
                        property = match[0];
                        return;
                    }
                    property = property[prop];
                });

                // заменяем шаблон на значение свойства из json объекта
                result += template.slice(0, match.index) + property;
                //
                template = template.slice(match.index + match[0].length);
            }
            result += template;

            return result;
        }

        _createPopup()
        {
            if (!this._props.has_popup)
            {
                // Убираем стиль cursor: pointer, если у маркера нет всплывающего окна
                this._container.style.cursor = 'auto';

                this._popup = document.createElement('ymaps');
                return this._popup;
            }

            if (this._props.is_popup_modal)
            {
                const modalId = `#popup-modal-${this._props.module_id}`;

                if (this._props.popup_framework === 'bootstrap')
                {
                    this.popupContainer = document.querySelector(modalId + ' .modal-body');
                    this.popupHeader = document.querySelector(modalId + ' .modal-title');
                    this._marker.element.addEventListener('click', () => {
                        const modalEl = document.querySelector(modalId);
                        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
                        modal.show();
                    });
                }
                else if (this._props.popup_framework === 'uikit')
                {
                    this.popupContainer = document.querySelector(modalId + ' .uk-modal-body');
                    this.popupHeader = document.querySelector(modalId + ' .uk-modal-title');
                    this._marker.element.setAttribute('uk-toggle', 'target: ' + modalId);
                }

                this._popup = document.createElement('ymaps');
                return this._popup;
            }

            const result = super._createPopup();

            this.popupContainer = this._popup.querySelector(`.${k}popup-container`);
            this._popup.style.alignItems = 'start';

            this.popupContainer.style.flex = '1 1 auto';
            this.popupContainer.style.textWrap = 'auto';
            this.popupContainer.style.overflow = 'auto';
            this.popupContainer.style.maxHeight = this._popupProps.maxHeight + 'px';

            return result;
        }

        _togglePopup(e)
        {
            // Если всплывающее окно уже открыто - ничего не делаем
            if (e && this._popupIsOpen)
            {
                return;
            }

            // закрываем последнее открытое всплывающие окно
            if (e && lastMarkerWithOpenedPopup && lastMarkerWithOpenedPopup !== this)
            {
                lastMarkerWithOpenedPopup._togglePopup(0);
            }

            super._togglePopup(e);

            if (e)
            {
                lastMarkerWithOpenedPopup = this;
            }

            if (e && this._props.has_popup)
            {
                //this.popupTitle.classList.add('placeholder');
                this.popupContainer.classList.add('placeholder');

                let markerInstance = this;

                Joomla.request({
                    url: window.location.origin + "/index.php?option=com_ajax&module=wtyandexmapitems&module_id=" + this._props.module_id + "&id=" + this._props.id + "&format=raw",
                    onSuccess: function (response, xhr) {
                        const responseObj = JSON.parse(response);
                        const popupData = responseObj.data;

                        console.log(popupData);

                        const template = document.getElementById(popupData.popup_layout_id);

                        if (markerInstance._props.is_popup_modal)
                        {
                            markerInstance.popupHeader.innerHTML = markerInstance._props.title;
                        }

                        if (template && template.content)
                        {
                            //markerInstance.popupTitle.innerHTML = popupData.item.title;
                            //markerInstance.popupTitle.classList.remove('placeholder');
                            // костыль для удаления лишнего автоматически добавленного слеш символа в шаблоне
                            let templateInnerHTML = template.innerHTML.replaceAll('href="/', 'href="');
                            // костыль для декодирования url encode символов в ссылочных атрибутах
                            // при использовании yootheme шаблона
                            templateInnerHTML = decodeURI(templateInnerHTML);

                            markerInstance.popupContainer.innerHTML = markerInstance._processTemplate(templateInnerHTML, popupData);
                            markerInstance.popupContainer.classList.remove('placeholder');
                        }
                    }
                });
            }
        }
    }

    document.querySelectorAll('[id^=mod_wtyandexmapitems]').forEach(mapHtmlObject => {
        // Числовой id модуля карты
        const module_id = parseInt(mapHtmlObject.getAttribute('data-module-id'));

        // Настройки карты
        const mapData = Joomla.getOptions(mapHtmlObject.id);

        // Отступ карты - 25% от меньшей величины размеров карты
        const marginPx = Math.min(mapHtmlObject.clientWidth, mapHtmlObject.clientHeight) / 4;

        // Максимальная высота всплывающего окна
        const popupMaxHeight = Math.min(mapHtmlObject.clientWidth, mapHtmlObject.clientHeight) - 60;

        // Объект карты
        const map = new ymaps3.YMap(
            mapHtmlObject,
            {
                location: {
                    center: mapData['center'],
                    zoom: mapData['zoom']
                },
                showScaleInCopyrights: true,
                margin: [marginPx, marginPx, marginPx, marginPx]
            }
        );

        // Добавляем слой на карту, в зависимости от указанного типа
        switch (mapData['type'])
        {
            case 'satellite':
                map.addChild(new ymaps3.YMapDefaultSatelliteLayer());
                break;
            case 'scheme':
            default:
                map.addChild(new ymaps3.YMapDefaultSchemeLayer());
                break;
        }

        map.addChild(new ymaps3.YMapDefaultFeaturesLayer());

        Joomla.request({
            url: window.location.origin + "/index.php?option=com_ajax&module=wtyandexmapitems&module_id=" + module_id + "&format=raw",
            onSuccess: function (response, xhr)
            {
                if (response !== "")
                {
                    let responseJson = JSON.parse(response);
                    console.log(responseJson);

                    if (!responseJson.success)
                    {
                        return;
                    }

                    let markers = responseJson.data.items;
                    let isPopupModal = responseJson.data.isPopupModal;
                    let popupFramework = responseJson.data.popupFramework;

                    // markers with clustering
                    markers.forEach(feature => {
                        // В API 3.0 формат координат изменился, теперь это "Долгота, Широта"
                        feature.geometry.coordinates = feature.geometry.coordinates.reverse();
                    });

                    const markerRender = (feature) => {
                        return new YMapCustomMarker({
                            module_id: module_id,
                            id: feature.id.toString(),
                            coordinates: feature.geometry.coordinates,
                            title: feature.item.title,
                            icon: feature.icon,
                            marker_layout_id: feature.marker_layout_id,
                            has_popup: feature.has_popup,
                            layout_data: feature,
                            is_popup_modal: isPopupModal,
                            popup_framework: popupFramework,
                            popup: {maxHeight: popupMaxHeight, header: feature.item.title, content: 'default text', position: 'right'}
                        });
                    }

                    const clusterRender = (coords, features) => {
                        return new ymaps3.YMapMarker({
                            coordinates: coords,
                            onClick() {
                                const bounds = getBounds(features.map(feature => feature.geometry.coordinates));
                                map.update({location: {bounds: bounds, easing: 'ease-in-out', duration: 250}});
                            }
                        }, cluster(features.length).cloneNode(true));
                    }

                    const clusterer = new YMapClusterer({
                        method: clusterByGrid({ gridSize: 64 }),
                        features: markers,
                        marker: markerRender,
                        cluster: clusterRender
                    });

                    map.addChild(clusterer);
                }
            }
        });
    });
;
    function cluster(count)
    {
        const circle = document.createElement('div');
        circle.classList.add('circle');
        circle.style = "cursor:pointer;width:48px;height:48px;background-color:rgb(255, 51, 51);border-radius:50%;transform:translate(-50%,-50%);display:flex;justify-content:center;align-items:center;";
        circle.innerHTML = `<span style="color:white;font-size:1.5rem" class="circle-text">${count}</span>`;
        return circle;
    }

    function getBounds(coordinates)
    {
        let minLat = Infinity, minLng = Infinity;
        let maxLat = -Infinity, maxLng = -Infinity;

        for (const coords of coordinates)
        {
            const lat = coords[1];
            const lng = coords[0];

            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
        }

        return [
            [minLng, minLat],
            [maxLng, maxLat]
        ];
    }
});