/**
 * @package       WT Yandex map items
 * @version    2.3.0
 * @author     Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2026 WebTolk, Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link          https://web-tolk.ru
 * @since      1.0.0
 */

document.addEventListener('DOMContentLoaded', async () => {
    await ymaps3.ready;
    const {YMapDefaultMarker} = await ymaps3.import('@yandex/ymaps3-markers@0.0.1');
    const {YMapClusterer, clusterByGrid} = await ymaps3.import('@yandex/ymaps3-clusterer@0.0.1');
    const {YMapListener} = ymaps3;
    const storageKeyPrefix = 'mod_wtyandexmapitems';
    let yandexDefaultUiThemePackage = null;

    let lastMarkerWithOpenedPopup = null;
    let popupRequestSequence = 0;
    const latestPopupRequestByModule = new Map();
    const k = 'ymaps3x0--default-marker__';

    function getMarkerIconBox(container)
    {
        return container.querySelector('ymaps.' + k + 'icon-box')
            || container.querySelector('[class$="icon-box"]')
            || container.querySelector('[class*="icon-box"]')
            || container;
    }

    function getPopupContainer(popup)
    {
        return popup.querySelector(`.${k}popup-container`)
            || popup.querySelector('[class$="popup-container"]')
            || popup.querySelector('[class*="popup-container"]')
            || popup;
    }

    const openedPopupMarkerZIndex = '10000';

    function getMarkerRoot(container)
    {
        return container ? container.closest('.ymaps3--marker') : null;
    }

    function setMarkerPopupZIndex(markerInstance, isOpened)
    {
        if (!markerInstance || !markerInstance._props || !markerInstance._props.has_popup || markerInstance._props.is_popup_modal)
        {
            return;
        }

        const markerRoot = getMarkerRoot(markerInstance._container);

        if (!markerRoot)
        {
            return;
        }

        if (isOpened)
        {
            if (markerRoot.dataset.wtyandexmapitemsPopupZIndexRaised !== '1')
            {
                markerRoot.dataset.wtyandexmapitemsInitialZIndex = markerRoot.style.zIndex || '';
                markerRoot.dataset.wtyandexmapitemsPopupZIndexRaised = '1';
            }

            markerRoot.style.zIndex = openedPopupMarkerZIndex;
            return;
        }

        if (markerRoot.dataset.wtyandexmapitemsPopupZIndexRaised === '1')
        {
            markerRoot.style.zIndex = markerRoot.dataset.wtyandexmapitemsInitialZIndex || '';
            delete markerRoot.dataset.wtyandexmapitemsInitialZIndex;
            delete markerRoot.dataset.wtyandexmapitemsPopupZIndexRaised;
        }
    }

    function getModuleOverlay(moduleId)
    {
        return document.getElementById('mod_wtyandexmapitems_overlay_' + moduleId);
    }

    async function getYandexDefaultUiThemePackage()
    {
        if (!yandexDefaultUiThemePackage)
        {
            if (ymaps3.import.registerCdn)
            {
                ymaps3.import.registerCdn('https://cdn.jsdelivr.net/npm/{package}', [
                    '@yandex/ymaps3-default-ui-theme@0.0'
                ]);
            }

            yandexDefaultUiThemePackage = ymaps3.import('@yandex/ymaps3-default-ui-theme').catch(error => {
                console.warn('wtyandexmapitems [Warning]: Failed to load Yandex Maps default UI theme package.', error);

                return {};
            });
        }

        return yandexDefaultUiThemePackage;
    }

    function normalizeMapControls(controls)
    {
        if (!Array.isArray(controls))
        {
            return [];
        }

        return controls.filter(control => control && typeof control === 'object' && control.type);
    }

    function hasConfiguredScaleControl(controls)
    {
        return normalizeMapControls(controls).some(control => control.type === 'scale' && ymaps3.YMapScaleControl);
    }

    function createFullscreenControl(mapHtmlObject)
    {
        if (!ymaps3.YMapControlButton || !mapHtmlObject.requestFullscreen)
        {
            return null;
        }

        return new ymaps3.YMapControlButton({
            text: '⛶',
            onClick: () => {
                if (document.fullscreenElement && document.exitFullscreen)
                {
                    document.exitFullscreen();
                    return;
                }

                mapHtmlObject.requestFullscreen();
            }
        });
    }

    function mapControlNeedsDefaultUiThemePackage(controlConfig)
    {
        return ['zoom', 'search', 'geolocation', 'rotate', 'tilt', 'rotate_tilt'].includes(controlConfig.type);
    }

    function updateMapLocationBySearchResult(map, searchResult)
    {
        if (!Array.isArray(searchResult) || searchResult.length === 0)
        {
            return;
        }

        const coordinates = searchResult
            .map(result => result && result.geometry ? result.geometry.coordinates : null)
            .filter(item => Array.isArray(item) && item.length === 2);

        if (coordinates.length === 0)
        {
            return;
        }

        if (coordinates.length === 1)
        {
            map.update({
                location: {
                    center: coordinates[0],
                    zoom: 12,
                    duration: 400
                }
            });

            return;
        }

        map.update({
            location: {
                bounds: getBounds(coordinates),
                duration: 400
            }
        });
    }

    function createConfiguredMapControl(controlConfig, map, mapHtmlObject, defaultUiThemePackage)
    {
        switch (controlConfig.type)
        {
            case 'zoom':
                return defaultUiThemePackage.YMapZoomControl ? new defaultUiThemePackage.YMapZoomControl({}) : null;
            case 'search':
                return defaultUiThemePackage.YMapSearchControl
                    ? new defaultUiThemePackage.YMapSearchControl({
                        searchResult: searchResult => updateMapLocationBySearchResult(map, searchResult)
                    })
                    : null;
            case 'fullscreen':
                return createFullscreenControl(mapHtmlObject);
            case 'geolocation':
                return defaultUiThemePackage.YMapGeolocationControl ? new defaultUiThemePackage.YMapGeolocationControl({}) : null;
            case 'scale':
                return ymaps3.YMapScaleControl ? new ymaps3.YMapScaleControl({}) : null;
            case 'rotate':
                return defaultUiThemePackage.YMapRotateControl ? new defaultUiThemePackage.YMapRotateControl({}) : null;
            case 'tilt':
                return defaultUiThemePackage.YMapTiltControl ? new defaultUiThemePackage.YMapTiltControl({}) : null;
            case 'rotate_tilt':
                return defaultUiThemePackage.YMapRotateTiltControl ? new defaultUiThemePackage.YMapRotateTiltControl({}) : null;
            default:
                return null;
        }
    }

    function getDefaultMapControlPosition(controlType)
    {
        switch (controlType)
        {
            case 'search':
                return 'top';
            case 'scale':
                return 'bottom left';
            case 'fullscreen':
            case 'rotate':
            case 'tilt':
            case 'rotate_tilt':
                return 'top right';
            case 'zoom':
            case 'geolocation':
            default:
                return 'right';
        }
    }

    async function addConfiguredMapControls(map, mapHtmlObject, controls)
    {
        const normalizedControls = normalizeMapControls(controls);

        if (normalizedControls.length === 0 || !ymaps3.YMapControls)
        {
            return;
        }

        const defaultUiThemePackage = normalizedControls.some(mapControlNeedsDefaultUiThemePackage)
            ? await getYandexDefaultUiThemePackage()
            : {};
        const controlGroups = {};

        normalizedControls.forEach(controlConfig => {
            const control = createConfiguredMapControl(controlConfig, map, mapHtmlObject, defaultUiThemePackage);

            if (!control)
            {
                return;
            }

            const position = typeof controlConfig.position === 'string' && controlConfig.position.trim()
                ? controlConfig.position.trim()
                : getDefaultMapControlPosition(controlConfig.type);
            const groupKey = position;

            if (!controlGroups[groupKey])
            {
                controlGroups[groupKey] = new ymaps3.YMapControls({position: position});
            }

            controlGroups[groupKey].addChild(control);
        });

        Object.keys(controlGroups).forEach(groupKey => {
            map.addChild(controlGroups[groupKey]);
        });
    }

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

            const iconBox = getMarkerIconBox(container);

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
                const modalEl = document.querySelector(modalId);

                if (this._props.popup_framework === 'bootstrap')
                {

                    this.popupContainer = document.querySelector(modalId + ' [data-wtyandexmapitems-popup-body]')
                        || document.querySelector(modalId + ' .modal-body');
                    this.popupHeader = document.querySelector(modalId + ' [data-wtyandexmapitems-popup-title]')
                        || document.querySelector(modalId + ' .modal-title');
                    this._marker.element.addEventListener('click', () => {
                        if (this.popupHeader)
                        {
                            this.popupHeader.innerHTML = this._props.title;
                        }

                        if (this.popupContainer)
                        {
                            this.popupContainer.innerHTML = '';
                            this.popupContainer.classList.add('placeholder');
                        }

                        if (modalEl && window.bootstrap && window.bootstrap.Modal)
                        {
                            const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
                            modal.show();
                        }
                    });
                }
                else if (this._props.popup_framework === 'uikit')
                {
                    this.popupContainer = document.querySelector(modalId + ' [data-wtyandexmapitems-popup-body]')
                        || document.querySelector(modalId + ' .uk-modal-body');
                    this.popupHeader = document.querySelector(modalId + ' [data-wtyandexmapitems-popup-title]')
                        || document.querySelector(modalId + ' .uk-modal-title');

                    if (modalEl)
                    {
                        this._marker.element.addEventListener('click', () => {
                            if (this.popupHeader)
                            {
                                this.popupHeader.innerHTML = this._props.title;
                            }

                            if (this.popupContainer)
                            {
                                this.popupContainer.innerHTML = '';
                                this.popupContainer.classList.add('placeholder');
                            }
                        });

                        this._marker.element.setAttribute('uk-toggle', 'target: ' + modalId);
                    }
                }

                if(this._props.wtYandexMapItemsModuleParams.useOverlay) {
                    let overlay = getModuleOverlay(this._props.module_id);
                    if (overlay && modalEl && this._props.popup_framework === 'bootstrap') {
                        modalEl.addEventListener('hidden.bs.modal', (event) => {
                            overlay.style.zIndex = -1;
                        });
                    } else if (overlay && window.UIkit && window.UIkit.util && this._props.popup_framework === 'uikit')
                    {
                        window.UIkit.util.on(modalId, 'hide', () => {
                            overlay.style.zIndex = -1;
                        });
                    }
                }

                this._popup = document.createElement('ymaps');
                return this._popup;
            }

            const result = super._createPopup();

            this.popupContainer = getPopupContainer(this._popup);
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
            if (e && this._popupIsOpen && !this._props.is_popup_modal)
            {
                return;
            }

            // закрываем последнее открытое всплывающие окно
            if (e && lastMarkerWithOpenedPopup && lastMarkerWithOpenedPopup !== this)
            {
                lastMarkerWithOpenedPopup._togglePopup(0);
            }

            super._togglePopup(e);

            const isInlinePopupOpened = Boolean(this._props.has_popup && !this._props.is_popup_modal && this._popupIsOpen);

            setMarkerPopupZIndex(this, isInlinePopupOpened);

            if (!isInlinePopupOpened && lastMarkerWithOpenedPopup === this)
            {
                lastMarkerWithOpenedPopup = null;
            }

            if (e && isInlinePopupOpened)
            {
                lastMarkerWithOpenedPopup = this;
            }

            if (e && this._props.has_popup)
            {
                //this.popupTitle.classList.add('placeholder');
                if (this.popupContainer)
                {
                    this.popupContainer.classList.add('placeholder');
                }

                let markerInstance = this;
                const popupRequestId = ++popupRequestSequence;
                const popupRequestModuleId = String(this._props.module_id);
                latestPopupRequestByModule.set(popupRequestModuleId, popupRequestId);

                Joomla.request({
                    url: window.location.origin + "/index.php?option=com_ajax&module=wtyandexmapitems&module_id=" + this._props.module_id + "&Itemid=" + this._props.item_id + "&marker_id=" + this._props.id + "&format=raw",
                    onSuccess: function (response, xhr) {
                        if (latestPopupRequestByModule.get(popupRequestModuleId) !== popupRequestId)
                        {
                            return;
                        }

                        if (!markerInstance._props.is_popup_modal && (!markerInstance._popupIsOpen || lastMarkerWithOpenedPopup !== markerInstance))
                        {
                            return;
                        }

                        const responseObj = JSON.parse(response);
                        const popupData = responseObj.data;

                        const template = document.getElementById(popupData.popup_layout_id);

                        if (markerInstance._props.is_popup_modal)
                        {
                            if (markerInstance.popupHeader)
                            {
                                markerInstance.popupHeader.innerHTML = markerInstance._props.title;
                            }
                        }

                        if (template && template.content && markerInstance.popupContainer)
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

    function normalizeMapCustomization(customization) {
        if (Array.isArray(customization)) {
            return customization;
        }

        if (customization && typeof customization === 'object') {
            return customization;
        }

        return null;
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
        const module_id = parseInt(mapHtmlObject.getAttribute('data-wtyandexmapitems-module-id'), 10);

        // Числовой id текущего пункта меню
        const item_id = mapHtmlObject.getAttribute('data-item-id');

        // Настройки карты
        const backendModuleParams = Joomla.getOptions(mapHtmlObject.id);
        const mapCustomizations = Joomla.getOptions('mod_wtyandexmapitemsCustomizations') || {};
        let frontendModuleParams;
        // Отступ карты - 25% от меньшей величины размеров карты
        const marginPx = Math.min(mapHtmlObject.clientWidth, mapHtmlObject.clientHeight) / 4;

        // Максимальная высота всплывающего окна
        const popupMaxHeight = Math.min(mapHtmlObject.clientWidth, mapHtmlObject.clientHeight) - 60;

        // Использовать ли оверлей
        const useOverlay = backendModuleParams['useOverlay'];
        const mapControls = backendModuleParams['controls'] || [];
        const showScaleInCopyrights = !hasConfiguredScaleControl(mapControls);
        // Значения по умолчанию
        let mapCenter = backendModuleParams['center'];
        let mapZoom = backendModuleParams['zoom'];
        const mapCustomization = normalizeMapCustomization(mapCustomizations[module_id]);

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
                mode: backendModuleParams['type'] === 'scheme' && mapCustomization ? 'vector' : 'automatic',
                showScaleInCopyrights: showScaleInCopyrights,
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
                map.addChild(new ymaps3.YMapDefaultSchemeLayer(
                    mapCustomization ? {customization: mapCustomization} : {}
                ));
                break;
        }

        map.addChild(new ymaps3.YMapDefaultFeaturesLayer());
        await addConfiguredMapControls(map, mapHtmlObject, mapControls);

        if (useOverlay) {
            const overlay = getModuleOverlay(module_id);
            if (overlay)
            {
                overlay.addEventListener('click',(e) => {
                    overlay.style.zIndex = -1;
                });
                mapHtmlObject.addEventListener('mouseleave',(e) => {
                    overlay.style.zIndex = 0;
                });
            }
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
            onActionEnd: ({type, camera, location}) => {
                mapActionEndHandler({type, camera, location, module_id, mapOptions: backendModuleParams});
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
    function getStorageKey(moduleId = null) {
        return moduleId ? storageKeyPrefix + moduleId : storageKeyPrefix;
    }

    function normalizeSavedMapParams(params) {
        if (!params || typeof params !== 'object' || Array.isArray(params)) {
            return null;
        }

        const normalized = {};

        if (Array.isArray(params.center) && params.center.length === 2) {
            const longitude = Number(params.center[0]);
            const latitude = Number(params.center[1]);

            if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
                normalized.center = [longitude, latitude];
            }
        }

        const zoom = Number(params.zoom);

        if (Number.isFinite(zoom)) {
            normalized.zoom = zoom;
        }

        return Object.keys(normalized).length > 0 ? normalized : null;
    }

    function saveParamsToLocalStorage(params, moduleId = null) {
        const dataModuleId = getStorageKey(moduleId);
        try {
            const savedParams = normalizeSavedMapParams(JSON.parse(localStorage.getItem(dataModuleId))) || {};
            const normalizedParams = normalizeSavedMapParams(params);

            if (!normalizedParams) {
                return;
            }

            const nextParams = {...savedParams, ...normalizedParams};

            localStorage.setItem(dataModuleId, JSON.stringify(nextParams));
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
        const dataModuleId = getStorageKey(moduleId);

        try {
            return normalizeSavedMapParams(JSON.parse(localStorage.getItem(dataModuleId)));
        } catch (e) {
            console.error(e.message);
            return null;
        }
    }

    /**
     * Сохраняем состояние карты только после завершения пользовательского действия.
     * Это не даёт нескольким экземплярам модуля перетирать localStorage
     * во время инициализации страницы или программных map.update().
     *
     * @param {string} type
     * @param {YMapCamera} camera
     * @param {YMapLocation} location
     * @param {int} module_id
     * @param {object} mapOptions
     *
     * @see https://yandex.com/maps-api/docs/js-api/dg/concepts/events.html
     */
    function mapActionEndHandler({type, camera, location, module_id, mapOptions}) {
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
