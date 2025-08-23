/**
 * @package       WT Yandex map items
 * @version    2.1.0
 * @author        Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2025 Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link          https://web-tolk.ru
 * @since      1.0.0
 */

document.addEventListener('DOMContentLoaded', async () => {
    await ymaps3.ready;
    const {YMapDefaultMarker} = await ymaps3.import('@yandex/ymaps3-markers@0.0.1');
    const {YMapClusterer, clusterByGrid} = await ymaps3.import('@yandex/ymaps3-clusterer@0.0.1');
    const {YMapListener} = ymaps3;

    let lastMarkerWithOpenedPopup = null;
    const k = 'ymaps3x0--default-marker__';

    /**
     *  кастомный класс маркера, основанный на YMapDefaultMarker
     */
    class YMapCustomMarker extends YMapDefaultMarker
    {
        _createContainer()
        {
            const container = super._createContainer();
            // атрибут data-module-id для ymaps-контейнера
            container.dataset.moduleId = this._props.module_id;
            // атрибут data-marker-id для ymaps-контейнера
            container.dataset.markerId = this._props.id;
            container.classList.add('wt-yandex-map-items-marker');
            // CSS-класс для просмотренных маркеров
            container.onclick = () => {
                container.classList.add('wt-yandex-map-items-marker-viewed');
            };
            // Маркер определен как активный по GET-параметру map[marker_id]={marker_id}
            if(this._props.isActive) {
                container.classList.add('wt-yandex-map-items-marker-active');
            }

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

                if(this._props.wtYandexMapItemsModuleParams.useOverlay) {
                    let overlay = document.getElementById('mod_wtyandexmapitems_overlay_'+this._props.module_id);
                    if (this._props.popup_framework === 'bootstrap') {
                        const modalEl = document.querySelector(modalId);
                        modalEl.addEventListener('hidden.bs.modal', (event) => {
                            overlay.style.zIndex = -1;
                        });
                    } else if (this._props.popup_framework === 'uikit')
                    {
                        UIkit.util.on(modalId, 'hide', () => {
                            overlay.style.zIndex = -1;
                        });
                    }
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
                    url: window.location.origin + "/index.php?option=com_ajax&module=wtyandexmapitems&module_id=" + this._props.module_id + "&Itemid=" + this._props.item_id + "&marker_id=" + this._props.id + "&format=raw",
                    onSuccess: function (response, xhr) {
                        const responseObj = JSON.parse(response);
                        const popupData = responseObj.data;

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

    document.querySelectorAll('[data-wtyandexmapitems-module-id]').forEach(mapHtmlObject => {
        initMap(mapHtmlObject);
    });

    /**
     *
     * @param mapHtmlObject
     * @returns {Promise<void>}
     */
    async function initMap(mapHtmlObject){
        // Числовой id модуля карты
        const module_id = parseInt(mapHtmlObject.getAttribute('data-wtyandexmapitems-module-id'));

        // Числовой id текущего пункта меню
        const item_id = mapHtmlObject.getAttribute('data-item-id');

        // Настройки карты
        const backendModuleParams = Joomla.getOptions(mapHtmlObject.id);
        let frontendModuleParams;
        // Отступ карты - 25% от меньшей величины размеров карты
        const marginPx = Math.min(mapHtmlObject.clientWidth, mapHtmlObject.clientHeight) / 4;

        // Максимальная высота всплывающего окна
        const popupMaxHeight = Math.min(mapHtmlObject.clientWidth, mapHtmlObject.clientHeight) - 60;

        // Использовать ли оверлей
        const useOverlay = backendModuleParams['useOverlay'];
        // Значения по умолчанию
        let mapCenter = backendModuleParams['center'];
        let mapZoom = backendModuleParams['zoom'];

        /**
         * 1. По умолчанию берем центр и зум из настроек модуля
         * 2. Если включено - определеяем геопозицию пользователя. Если он разрешил и определилось - заменяем центр карты на позицию пользователя,
         * 3. Если есть сохранённые параметры центра и зума в браузере - используем их.
         */

        if(backendModuleParams['detect_geolocation']){
            mapCenter = await detectGeolocation();
        }

        if (backendModuleParams['save_camera']) {
            switch (backendModuleParams['save_camera']) {
                case 'module':
                    frontendModuleParams = getParamsFromLocalStorage(module_id);
                    break;
                case 'general':
                case 'default':
                    frontendModuleParams = getParamsFromLocalStorage();
                    break;
            }
            if(frontendModuleParams != null) {
                if('center' in frontendModuleParams) {
                    mapCenter = frontendModuleParams['center'];
                }
                if('zoom' in frontendModuleParams) {
                    mapZoom = frontendModuleParams['zoom'];
                }
            }
        }

        const currentUrl = new URL(window.location);
        let zoom = currentUrl.searchParams.get('map[zoom]');
        if(zoom) {
            mapZoom = parseInt(zoom);
        }
        let latitude = currentUrl.searchParams.get('map[center_latitude]');
        let longitude = currentUrl.searchParams.get('map[center_longitude]');
        if(latitude && longitude) {
            mapCenter = [parseFloat(longitude), parseFloat(latitude)];
        }

        // Объект карты
        const map = new ymaps3.YMap(
            mapHtmlObject,
            {
                location: {
                    center: mapCenter,
                    zoom: mapZoom
                },
                showScaleInCopyrights: true,
                margin: [marginPx, marginPx, marginPx, marginPx]
            }
        );

        // Добавляем слой на карту, в зависимости от указанного типа
        switch (backendModuleParams['type'])
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
        if (useOverlay) {
            const overlay = document.getElementById('mod_wtyandexmapitems_overlay_'+module_id);
            overlay.addEventListener('click',(e) => {
                overlay.style.zIndex = -1;
            });
            mapHtmlObject.addEventListener('mouseleave',(e) => {
                overlay.style.zIndex = 0;
            });
        }

        Joomla.request({
            url: window.location.origin + "/index.php?option=com_ajax&module=wtyandexmapitems&module_id=" + module_id + "&Itemid=" + item_id + "&format=raw",
            onSuccess: function (response, xhr)
            {
                if (response !== "")
                {
                    let responseJson = JSON.parse(response);

                    if (!responseJson.success)
                    {
                        return;
                    }

                    let markers = responseJson.data.items;
                    let isPopupModal = responseJson.data.isPopupModal;
                    let popupFramework = responseJson.data.popupFramework;

                    if (!Array.isArray(markers))
                    {
                        console.warn('wtyandexmapitems [Error]: "data.items" property isn\'t array!');
                        return;
                    }

                    // markers with clustering
                    markers.forEach(feature => {
                        // В API 3.0 формат координат изменился, теперь это "Долгота, Широта"
                        feature.geometry.coordinates = feature.geometry.coordinates.reverse();
                    });

                    let marker_id = currentUrl.searchParams.get('map[marker_id]');

                    const markerRender = (feature) => {
                        let isActive = false;
                        if(marker_id) {
                            isActive = feature.id === parseInt(marker_id);
                        }

                        return new YMapCustomMarker({
                            module_id: module_id,
                            item_id: item_id,
                            id: feature.id.toString(),
                            coordinates: feature.geometry.coordinates,
                            title: feature.item.title,
                            icon: feature.icon,
                            marker_layout_id: feature.marker_layout_id,
                            has_popup: feature.has_popup,
                            layout_data: feature,
                            isActive: isActive,
                            is_popup_modal: isPopupModal,
                            popup_framework: popupFramework,
                            popup: {maxHeight: popupMaxHeight, header: feature.item.title, content: 'default text', position: 'right'},
                            wtYandexMapItemsModuleParams: {useOverlay: useOverlay}
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

                    // Центр карты на маркере из GET-параметров

                    if(marker_id && markers) {
                        const customZoom =  backendModuleParams['url_get_param_map_marker_id_custom_zoom'];
                        if(customZoom && customZoom > 0) {
                            mapZoom = customZoom;
                        }
                        for (const key in markers) {
                            if(markers[key].id == marker_id) {
                                map.update({
                                    location: {
                                        center: markers[key].geometry.coordinates,
                                        zoom: mapZoom,
                                        easing: 'ease-in-out', duration: 250
                                    }
                                });
                                break;
                            }
                        }
                    }
                }
            }
        });

        // Создание объекта-слушателя.
        const mapListener = new YMapListener({
            layer: 'any',
            // Добавление обработчиков на слушатель.
            onUpdate: ({type, camera, location})=>{
                mapUpdateHandler({type, camera, location, module_id, mapOptions: backendModuleParams});
            }
        });

        map.addChild(mapListener);
    }
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

    /**
     *
     * @param {object} params Params to save
     * @param {string} moduleId
     */
    function saveParamsToLocalStorage(params, moduleId = null) {
        let dataModuleId = 'mod_wtyandexmapitems';
        if (moduleId) {
            dataModuleId += moduleId;
        }

        try {
            let savedParams = JSON.parse(localStorage.getItem(dataModuleId));
            savedParams = {...savedParams, ...params};
            localStorage.setItem(dataModuleId, JSON.stringify(savedParams));
        } catch (e) {
            console.error(e.message);
        }

    }

    /**
     * Get map params from local storage
     *
     * @param moduleId
     * @returns {any}
     */
    function getParamsFromLocalStorage(moduleId = null) {

        let dataModuleId = 'mod_wtyandexmapitems';
        if (moduleId) {
            dataModuleId += moduleId;
        }

        try {
            return JSON.parse(localStorage.getItem(dataModuleId));
        } catch (e) {
            console.error(e.message);
            return null;
        }
    }

    /**
     * Обработчик события update Яндекс.карты.
     *
     * @param {string} type
     * @param {YMapCamera} camera
     * @param {YMapLocation} location
     * @param {int} module_id
     * @param {object} mapOptions
     *
     * @see https://yandex.ru/maps-api/docs/js-api/object/events/YMapListener.html#params
     */
    function mapUpdateHandler({type, camera, location, module_id, mapOptions}) {
        const newParams = {
            'center': location.center,
            'zoom': location.zoom,
        };
        if(mapOptions['save_camera'] && mapOptions['save_camera'] === 'module') {
            saveParamsToLocalStorage(newParams, module_id);
        } else {
            saveParamsToLocalStorage(newParams);
        }
    }

    async function detectGeolocation(){
        const position = await ymaps3.geolocation.getPosition();
        if(position) {
            mapCenter = position['coords'];
            return mapCenter;
        }
    }
});