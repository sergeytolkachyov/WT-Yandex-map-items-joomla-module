/**
 * @package       WT Yandex map items
 * @version    2.3.4
 * @author     Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2026 WebTolk, Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link          https://web-tolk.ru
 * @since      1.0.0
 */

document.addEventListener('DOMContentLoaded', async () => {
    await ymaps3.ready;
    const storageKeyPrefix = 'mod_wtyandexmapitems';
    let yandexDefaultUiThemePackage = null;
    let yandexWorldUtilsPackage = null;
    let yandexClustererPackage = null;

    const defaultUiThemePackage = await getYandexDefaultUiThemePackage();
    const {YMapDefaultMarker, YMapPopupMarker} = defaultUiThemePackage;
    const {YMapListener} = ymaps3;

    if (!YMapDefaultMarker || !defaultUiThemePackage.YMapPopupMarker)
    {
        console.warn('wtyandexmapitems [Error]: Yandex Maps default UI theme marker package is unavailable.');
        return;
    }

    let lastMarkerWithOpenedPopup = null;
    let popupRequestSequence = 0;
    const latestPopupRequestByModule = new Map();
    const mobilePopupMediaQuery = '(max-width: 767.98px)';

    function getMarkerIconBox(container)
    {
        if (!container)
        {
            return null;
        }

        return container.querySelector('[class$="icon-box"]')
            || container.querySelector('[class*="icon-box"]')
            || container;
    }

    function getPopupContainer(popup)
    {
        if (!popup)
        {
            return null;
        }

        return popup.querySelector('[class$="popup-container"]')
            || popup.querySelector('[class*="popup-container"]')
            || popup.querySelector('.ymaps3--popup-marker_container')
            || popup;
    }

    function getMarkerRoot(container)
    {
        return container ? container.closest('.ymaps3--marker') : null;
    }

    function addUniqueElement(elements, element)
    {
        if (element && element instanceof HTMLElement && !elements.includes(element))
        {
            elements.push(element);
        }
    }

    function getMarkerElement(markerInstance)
    {
        if (!markerInstance)
        {
            return null;
        }

        return markerInstance._marker && markerInstance._marker.element
            ? markerInstance._marker.element
            : null;
    }

    function getMarkerVisualElement(markerInstance)
    {
        if (!markerInstance)
        {
            return null;
        }

        return markerInstance._markerElement || markerInstance._container || getMarkerElement(markerInstance);
    }

    function getPopupElement(markerInstance)
    {
        if (!markerInstance || !markerInstance._popup)
        {
            return null;
        }

        return markerInstance._popup._markerElement || markerInstance._popup;
    }

    function getPopupContainerElement(markerInstance)
    {
        if (!markerInstance || !markerInstance._popup)
        {
            return null;
        }

        return markerInstance._popup._popupContainer || getPopupContainer(getPopupElement(markerInstance));
    }

    function getMarkerPopupStackElements(markerInstance)
    {
        const elements = [];
        const markerElement = getMarkerElement(markerInstance);
        const markerVisualElement = getMarkerVisualElement(markerInstance);
        const popupElement = getPopupElement(markerInstance);
        const popupContainer = getPopupContainerElement(markerInstance);
        const markerRoot = getMarkerRoot(markerVisualElement) || getMarkerRoot(markerElement);
        const popupRoot = getMarkerRoot(popupElement);

        addUniqueElement(elements, markerRoot);
        addUniqueElement(elements, markerVisualElement);
        addUniqueElement(elements, markerElement);
        addUniqueElement(elements, popupRoot);
        addUniqueElement(elements, popupElement);
        addUniqueElement(elements, popupContainer);

        return elements;
    }

    function setMarkerPopupZIndex(markerInstance, isOpened)
    {
        if (!markerInstance || !markerInstance._props || !markerInstance._props.has_popup || markerInstance._props.is_popup_modal)
        {
            return;
        }

        const markerRoot = getMarkerRoot(getMarkerVisualElement(markerInstance))
            || getMarkerRoot(getMarkerElement(markerInstance));
        const stackElements = getMarkerPopupStackElements(markerInstance).filter(element => element !== markerRoot);

        if (markerRoot)
        {
            markerRoot.classList.toggle('wt-yandex-map-items-marker-popup-open', isOpened);
        }

        stackElements.forEach(element => {
            element.classList.toggle('wt-yandex-map-items-popup-stack-open', isOpened);
        });
    }

    function updateMobilePopupMapBoundary(markerInstance)
    {
        if (!markerInstance || !markerInstance._props || !markerInstance._props.map_html_object)
        {
            return;
        }

        const mapElement = markerInstance._props.map_html_object;

        if (!window.matchMedia(mobilePopupMediaQuery).matches)
        {
            mapElement.style.removeProperty('--wtymi-popup-mobile-map-bottom');
            return;
        }

        const mapRect = mapElement.getBoundingClientRect();
        const bottomOffset = Math.max(window.innerHeight - mapRect.bottom, 0);
        mapElement.style.setProperty('--wtymi-popup-mobile-map-bottom', bottomOffset + 'px');
    }

    function resetMobilePopupMapBoundary(markerInstance)
    {
        if (markerInstance && markerInstance._props && markerInstance._props.map_html_object)
        {
            markerInstance._props.map_html_object.style.removeProperty('--wtymi-popup-mobile-map-bottom');
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

    async function getYandexWorldUtilsPackage()
    {
        if (!yandexWorldUtilsPackage)
        {
            if (ymaps3.import.registerCdn)
            {
                ymaps3.import.registerCdn('https://cdn.jsdelivr.net/npm/{package}', [
                    '@yandex/ymaps3-world-utils@0.0'
                ]);
            }

            yandexWorldUtilsPackage = ymaps3.import('@yandex/ymaps3-world-utils').catch(error => {
                console.warn('wtyandexmapitems [Warning]: Failed to load Yandex Maps world utilities package.', error);

                return {};
            });
        }

        return yandexWorldUtilsPackage;
    }

    async function getYandexClustererPackage()
    {
        if (!yandexClustererPackage)
        {
            if (ymaps3.import.registerCdn)
            {
                ymaps3.import.registerCdn('https://cdn.jsdelivr.net/npm/{package}', [
                    '@yandex/ymaps3-clusterer@0.0'
                ]);
            }

            yandexClustererPackage = ymaps3.import('@yandex/ymaps3-clusterer').catch(error => {
                console.warn('wtyandexmapitems [Warning]: Failed to load Yandex Maps clusterer package.', error);

                return {};
            });
        }

        return yandexClustererPackage;
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

    function normalizeClusterOptions(options)
    {
        const normalizedOptions = options && typeof options === 'object' ? options : {};
        const gridSize = parseInt(normalizedOptions.gridSize, 10);
        const markerView = normalizedOptions.markerView === 'image' ? 'image' : 'default';

        return {
            enabled: normalizedOptions.enabled !== false,
            gridSize: Number.isFinite(gridSize) && gridSize > 0 ? gridSize : 64,
            showCount: normalizedOptions.showCount !== false,
            markerView: markerView,
            markerImage: typeof normalizedOptions.markerImage === 'string' ? normalizedOptions.markerImage.trim() : ''
        };
    }

    function normalizeRelativeImagePath(path)
    {
        if (!path)
        {
            return '';
        }

        if (/^(?:https?:)?\/\//i.test(path) || path.startsWith('data:'))
        {
            return path;
        }

        return '/' + path.replace(/^\/+/, '');
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
     *  Кастомный маркер модуля: публичный YMapMarker + YMapPopupMarker из default-ui-theme.
     */
    class YMapCustomMarker extends ymaps3.YMapComplexEntity
    {
        constructor(props)
        {
            super(props);

            this._marker = null;
            this._popup = null;
            this._markerElement = null;
            this._popupIsOpen = false;
            this._modalOverlayCloseBound = false;
            this.popupHeader = null;
            this.popupRoot = null;
            this.popupContainer = null;
            this.popupCloseButton = null;

            if (props.has_popup && !props.is_popup_modal)
            {
                this.popupRoot = document.createElement('div');
                this.popupRoot.className = 'wt-yandex-map-items-popup placeholder';
                this.popupRoot.dataset.wtyandexmapitemsPopup = 'inline';
                this.popupRoot.dataset.moduleId = props.module_id;
                this.popupRoot.dataset.markerId = props.id;
                this.popupRoot.dataset.state = 'loading';

                this.popupCloseButton = document.createElement('button');
                this.popupCloseButton.type = 'button';
                this.popupCloseButton.className = 'wt-yandex-map-items-popup__close';
                this.popupCloseButton.setAttribute('aria-label', 'Close popup');
                this.popupCloseButton.textContent = '×';

                this.popupContainer = document.createElement('div');
                this.popupContainer.className = 'wt-yandex-map-items-popup__content placeholder';

                this.popupRoot.appendChild(this.popupCloseButton);
                this.popupRoot.appendChild(this.popupContainer);

                this.popupCloseButton.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this._togglePopup(false);
                });
            }
        }

        _onAttach()
        {
            this._markerElement = this._createMarkerElement();
            this._marker = new ymaps3.YMapMarker({
                coordinates: this._props.coordinates
            }, this._markerElement);

            this.addChild(this._marker);

            if (this._props.has_popup && !this._props.is_popup_modal)
            {
                this._popup = new YMapPopupMarker({
                    coordinates: this._props.coordinates,
                    position: this._props.popup && this._props.popup.position ? this._props.popup.position : 'right',
                    offset: this._props.popup && Number.isFinite(this._props.popup.offset) ? this._props.popup.offset : 8,
                    show: false,
                    content: () => this.popupRoot,
                    onOpen: () => {
                        this._syncPopupElements();
                        this._setInlinePopupOpenState(true);
                    },
                    onClose: () => {
                        this._togglePopup(false);
                    }
                });
                this.addChild(this._popup);
                this._syncPopupElements();
            }

            this._prepareModalTrigger();
        }

        _onDetach()
        {
            if (this._popup)
            {
                this.removeChild(this._popup);
                this._popup = null;
            }

            if (this._marker)
            {
                this.removeChild(this._marker);
                this._marker = null;
            }
        }

        _onUpdate(changedProps)
        {
            if (changedProps.coordinates)
            {
                if (this._marker)
                {
                    this._marker.update({coordinates: changedProps.coordinates});
                }

                if (this._popup)
                {
                    this._popup.update({coordinates: changedProps.coordinates});
                }
            }
        }

        _createMarkerElement()
        {
            const container = document.createElement('div');
            container.dataset.moduleId = this._props.module_id;
            container.dataset.markerId = this._props.id;
            container.classList.add('wt-yandex-map-items-marker');
            container.classList.toggle('wt-yandex-map-items-marker-has-popup', Boolean(this._props.has_popup));
            container.classList.toggle('wt-yandex-map-items-marker-active', Boolean(this._props.isActive));
            container.title = this._props.title || '';
            container.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                container.classList.add('wt-yandex-map-items-marker-viewed');
                this._togglePopup(true);
            });

            if (this._props.marker_layout_id)
            {
                const template = document.getElementById(this._props.marker_layout_id);

                if (template && template.content)
                {
                    container.innerHTML = this._processTemplate(template.innerHTML, this._props.layout_data);
                    return container;
                }
            }

            if (this._props.icon)
            {
                const imageMarker = document.createElement('div');
                imageMarker.className = 'wt-yandex-map-items-marker__image-marker';

                const icon = document.createElement('img');
                const iconUrl = this._props.icon.url || '';
                icon.src = iconUrl.charAt(0) === '/' ? iconUrl : '/' + iconUrl;
                icon.alt = this._props.icon.alt_text || this._props.title || '';
                icon.className = 'wt-yandex-map-items-marker__image';
                imageMarker.appendChild(icon);

                container.classList.add('wt-yandex-map-items-marker-has-image');
                container.appendChild(imageMarker);

                return container;
            }

            const defaultMarker = document.createElement('div');
            defaultMarker.className = 'wt-yandex-map-items-marker__default-pin';
            container.appendChild(defaultMarker);

            return container;
        }

        _syncPopupElements()
        {
            const popupElement = getPopupElement(this);
            const popupContainer = getPopupContainerElement(this);

            const popupRoot = getMarkerRoot(popupElement);

            if (popupRoot && popupRoot instanceof HTMLElement)
            {
                popupRoot.classList.add('wt-yandex-map-items-popup-marker-root');
                popupRoot.dataset.wtyandexmapitemsPopupMarkerRoot = '1';
                popupRoot.dataset.moduleId = this._props.module_id;
                popupRoot.dataset.markerId = this._props.id;
            }

            if (popupElement && popupElement instanceof HTMLElement)
            {
                popupElement.classList.add('wt-yandex-map-items-popup-marker');
                popupElement.dataset.wtyandexmapitemsPopupMarker = '1';
                popupElement.dataset.moduleId = this._props.module_id;
                popupElement.dataset.markerId = this._props.id;
            }

            if (popupContainer && popupContainer instanceof HTMLElement)
            {
                popupContainer.classList.add('wt-yandex-map-items-popup-marker__container');
            }
        }

        _processTemplate(template, templateData)
        {
            if (!templateData)
            {
                return template;
            }

            let result = '';

            while (true)
            {
                const match = template.match(/\${\w+(?:\.[\w-]+)*}/);

                if (!match) break;

                const matchContent = match[0].substring(2, match[0].length - 1);
                const props = matchContent.split('.');
                let property = templateData;
                props.forEach(prop => {
                    if (!property.hasOwnProperty(prop))
                    {
                        property = match[0];
                        return;
                    }
                    property = property[prop];
                });

                result += template.slice(0, match.index) + property;
                template = template.slice(match.index + match[0].length);
            }
            result += template;

            return result;
        }

        _prepareModalTrigger()
        {
            if (!this._props.has_popup || !this._props.is_popup_modal || this._props.popup_framework !== 'uikit')
            {
                return;
            }

            this._markerElement.setAttribute('uk-toggle', 'target: #popup-modal-' + this._props.module_id);
        }

        _resolveModalElements()
        {
            const modalId = '#popup-modal-' + this._props.module_id;
            const modalEl = document.querySelector(modalId);

            this.popupContainer = document.querySelector(modalId + ' [data-wtyandexmapitems-popup-body]')
                || document.querySelector(modalId + ' .modal-body')
                || document.querySelector(modalId + ' .uk-modal-body');
            this.popupHeader = document.querySelector(modalId + ' [data-wtyandexmapitems-popup-title]')
                || document.querySelector(modalId + ' .modal-title')
                || document.querySelector(modalId + ' .uk-modal-title');

            return {modalId, modalEl};
        }

        _bindModalOverlayClose(modalId, modalEl)
        {
            if (this._modalOverlayCloseBound || !this._props.wtYandexMapItemsModuleParams.useOverlay)
            {
                return;
            }

            const overlay = getModuleOverlay(this._props.module_id);

            if (overlay && modalEl && this._props.popup_framework === 'bootstrap')
            {
                modalEl.addEventListener('hidden.bs.modal', () => {
                    overlay.style.zIndex = -1;
                });
                this._modalOverlayCloseBound = true;
            }
            else if (overlay && window.UIkit && window.UIkit.util && this._props.popup_framework === 'uikit')
            {
                window.UIkit.util.on(modalId, 'hide', () => {
                    overlay.style.zIndex = -1;
                });
                this._modalOverlayCloseBound = true;
            }
        }

        _openModalPopup()
        {
            const {modalId, modalEl} = this._resolveModalElements();

            if (this.popupHeader)
            {
                this.popupHeader.innerHTML = this._props.title;
            }

            this._setPopupLoading(true);
            this._bindModalOverlayClose(modalId, modalEl);

            if (this._props.popup_framework === 'bootstrap' && modalEl && window.bootstrap && window.bootstrap.Modal)
            {
                const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
                modal.show();
            }
            else if (this._props.popup_framework === 'uikit' && modalEl && window.UIkit && window.UIkit.modal)
            {
                const modal = window.UIkit.modal(modalEl);

                if (modal && typeof modal.show === 'function')
                {
                    modal.show();
                }
            }
        }

        _bindMobilePopupBoundary()
        {
            if (!this._mobilePopupBoundaryHandler)
            {
                this._mobilePopupBoundaryHandler = () => updateMobilePopupMapBoundary(this);
            }

            updateMobilePopupMapBoundary(this);
            window.addEventListener('resize', this._mobilePopupBoundaryHandler, {passive: true});
            window.addEventListener('scroll', this._mobilePopupBoundaryHandler, {passive: true});
        }

        _unbindMobilePopupBoundary()
        {
            if (this._mobilePopupBoundaryHandler)
            {
                window.removeEventListener('resize', this._mobilePopupBoundaryHandler);
                window.removeEventListener('scroll', this._mobilePopupBoundaryHandler);
            }

            resetMobilePopupMapBoundary(this);
        }

        _setPopupLoading(isLoading)
        {
            if (this.popupRoot)
            {
                this.popupRoot.classList.toggle('placeholder', isLoading);
                this.popupRoot.dataset.state = isLoading ? 'loading' : 'ready';
            }

            if (this.popupContainer)
            {
                if (isLoading)
                {
                    this.popupContainer.innerHTML = '';
                }

                this.popupContainer.classList.toggle('placeholder', isLoading);
            }
        }

        _setInlinePopupOpenState(isOpened)
        {
            setMarkerPopupZIndex(this, isOpened);
            this._syncPopupElements();

            if (this.popupRoot)
            {
                this.popupRoot.dataset.state = isOpened ? (this.popupContainer && this.popupContainer.classList.contains('placeholder') ? 'loading' : 'ready') : 'closed';
            }

            if (this._props.map_html_object)
            {
                this._props.map_html_object.dataset.wtyandexmapitemsPopupOpen = isOpened ? '1' : '0';
            }

            if (isOpened)
            {
                this._bindMobilePopupBoundary();
            }
            else
            {
                this._unbindMobilePopupBoundary();
            }
        }

        _togglePopup(e)
        {
            if (!this._props.has_popup)
            {
                return;
            }

            if (this._props.is_popup_modal)
            {
                if (e)
                {
                    this._openModalPopup();
                    this._requestPopupContent();
                }

                return;
            }

            const isOpening = Boolean(e);

            if (isOpening && this._popupIsOpen)
            {
                return;
            }

            if (isOpening && lastMarkerWithOpenedPopup && lastMarkerWithOpenedPopup !== this)
            {
                lastMarkerWithOpenedPopup._togglePopup(false);
            }

            this._popupIsOpen = isOpening;

            if (this._popup && typeof this._popup.update === 'function')
            {
                this._popup.update({show: isOpening});
            }

            this._setInlinePopupOpenState(isOpening);

            if (!isOpening)
            {
                if (lastMarkerWithOpenedPopup === this)
                {
                    lastMarkerWithOpenedPopup = null;
                }

                return;
            }

            lastMarkerWithOpenedPopup = this;

            if (typeof this._props.ensurePopupInBounds === 'function')
            {
                this._props.ensurePopupInBounds(this);
            }

            this._setPopupLoading(true);
            this._requestPopupContent();
        }

        _requestPopupContent()
        {
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

                    if (markerInstance._props.is_popup_modal && markerInstance.popupHeader)
                    {
                        markerInstance.popupHeader.innerHTML = markerInstance._props.title;
                    }

                    if (template && template.content && markerInstance.popupContainer)
                    {
                        let templateInnerHTML = template.innerHTML.replaceAll('href="/', 'href="');
                        templateInnerHTML = decodeURI(templateInnerHTML);

                        markerInstance.popupContainer.innerHTML = markerInstance._processTemplate(templateInnerHTML, popupData);
                        markerInstance._setPopupLoading(false);

                        if (!markerInstance._props.is_popup_modal && typeof markerInstance._props.ensurePopupInBounds === 'function')
                        {
                            markerInstance._props.ensurePopupInBounds(markerInstance);
                        }
                    }
                }
            });
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
        mapHtmlObject.classList.add('wt-yandex-map-items');
        mapHtmlObject.dataset.wtyandexmapitemsPopupOpen = '0';

        // Числовой id текущего пункта меню
        const item_id = mapHtmlObject.getAttribute('data-item-id');

        // Настройки карты
        const backendModuleParams = Joomla.getOptions(mapHtmlObject.id);
        const mapCustomizations = Joomla.getOptions('mod_wtyandexmapitemsCustomizations') || {};
        let frontendModuleParams;
        // Отступ карты - 25% от меньшей величины размеров карты
        const marginPx = Math.min(mapHtmlObject.clientWidth, mapHtmlObject.clientHeight) / 4;

        // Использовать ли оверлей
        const useOverlay = backendModuleParams['useOverlay'];
        const mapControls = backendModuleParams['controls'] || [];
        const clusterOptions = normalizeClusterOptions(backendModuleParams['cluster']);
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
                mode: backendModuleParams['type'] === 'scheme' && mapCustomization ? 'vector' : 'raster',
                showScaleInCopyrights: showScaleInCopyrights,
                margin: [marginPx, marginPx, marginPx, marginPx]
            }
        );
        let currentMapLocation = {
            center: mapCenter,
            zoom: mapZoom
        };

        async function ensurePopupInBounds(markerInstance)
        {
            await new Promise(resolve => window.requestAnimationFrame(resolve));

            if (!markerInstance || !markerInstance._popupIsOpen || markerInstance._props.is_popup_modal || !markerInstance._popup)
            {
                return;
            }

            if (window.matchMedia(mobilePopupMediaQuery).matches)
            {
                return;
            }

            const popupElement = getPopupContainerElement(markerInstance) || getPopupElement(markerInstance) || markerInstance.popupRoot;

            if (!popupElement)
            {
                return;
            }

            const popupRect = popupElement.getBoundingClientRect();
            const mapRect = mapHtmlObject.getBoundingClientRect();
            const viewportPadding = 16;
            const usableWidth = mapRect.width - viewportPadding * 2;
            const usableHeight = mapRect.height - viewportPadding * 2;

            if (popupRect.width > usableWidth || popupRect.height > usableHeight || !Array.isArray(currentMapLocation.center) || !Number.isFinite(currentMapLocation.zoom))
            {
                return;
            }

            const popupCenterX = popupRect.left + popupRect.width / 2;
            const popupCenterY = popupRect.top + popupRect.height / 2;
            const targetCenterX = Math.min(
                Math.max(popupCenterX, mapRect.left + viewportPadding + popupRect.width / 2),
                mapRect.right - viewportPadding - popupRect.width / 2
            );
            const targetCenterY = Math.min(
                Math.max(popupCenterY, mapRect.top + viewportPadding + popupRect.height / 2),
                mapRect.bottom - viewportPadding - popupRect.height / 2
            );
            const shiftX = targetCenterX - popupCenterX;
            const shiftY = targetCenterY - popupCenterY;

            if (Math.abs(shiftX) < 1 && Math.abs(shiftY) < 1)
            {
                return;
            }

            const worldUtils = await getYandexWorldUtilsPackage();

            if (!markerInstance._popupIsOpen || !worldUtils.worldToPixels || !worldUtils.pixelsToWorld || !map.projection)
            {
                return;
            }

            const zoom = currentMapLocation.zoom;
            const centerWorld = map.projection.toWorldCoordinates(currentMapLocation.center);
            const centerPixels = worldUtils.worldToPixels({x: centerWorld.x, y: centerWorld.y}, zoom);
            const nextCenterWorld = worldUtils.pixelsToWorld({
                x: centerPixels.x - shiftX,
                y: centerPixels.y - shiftY
            }, zoom);
            const nextCenter = map.projection.fromWorldCoordinates({x: nextCenterWorld.x, y: nextCenterWorld.y});

            map.update({
                location: {
                    center: nextCenter,
                    zoom: zoom,
                    easing: 'ease-in-out',
                    duration: 250
                }
            });
        }

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
            onSuccess: async function (response, xhr)
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
                            popup: {position: 'right', offset: 8},
                            ensurePopupInBounds: ensurePopupInBounds,
                            map_html_object: mapHtmlObject,
                            wtYandexMapItemsModuleParams: {useOverlay: useOverlay}
                        });
                    }

                    const clusterRender = (coords, features) => {
                        const clusterElement = cluster(features.length, clusterOptions).cloneNode(true);
                        const zoomToClusterBounds = event => {
                            if (event && typeof event.preventDefault === 'function')
                            {
                                event.preventDefault();
                            }

                            if (event && typeof event.stopPropagation === 'function')
                            {
                                event.stopPropagation();
                            }

                            const currentZoom = Number(currentMapLocation.zoom);
                            const fallbackZoom = Number(mapZoom);
                            const nextZoomBase = Number.isFinite(currentZoom) ? currentZoom : fallbackZoom;
                            const nextZoom = Math.min((Number.isFinite(nextZoomBase) ? nextZoomBase : 12) + 2, 20);

                            map.update({location: {center: coords, zoom: nextZoom, easing: 'ease-in-out', duration: 250}});
                        };

                        clusterElement.addEventListener('click', zoomToClusterBounds);

                        return new ymaps3.YMapMarker({
                            coordinates: coords,
                            onClick: zoomToClusterBounds,
                            onFastClick: zoomToClusterBounds
                        }, clusterElement);
                    }

                    if (clusterOptions.enabled)
                    {
                        const {YMapClusterer, clusterByGrid} = await getYandexClustererPackage();
                        const clusterer = new YMapClusterer({
                            method: clusterByGrid({ gridSize: clusterOptions.gridSize }),
                            features: markers,
                            marker: markerRender,
                            cluster: clusterRender
                        });

                        map.addChild(clusterer);
                    }
                    else
                    {
                        markers.forEach(feature => {
                            map.addChild(markerRender(feature));
                        });
                    }

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
            onUpdate: ({location}) => {
                if (location && Array.isArray(location.center) && Number.isFinite(location.zoom))
                {
                    currentMapLocation = {
                        center: location.center,
                        zoom: location.zoom
                    };
                }
            },
            onActionEnd: ({type, camera, location}) => {
                mapActionEndHandler({type, camera, location, module_id, mapOptions: backendModuleParams});
            }
        });

        map.addChild(mapListener);
    }
    function cluster(count, clusterOptions)
    {
        const circle = document.createElement('div');

        circle.classList.add('circle');
        circle.style = 'cursor:pointer;width:48px;height:48px;background-color:rgb(255, 51, 51);border-radius:50%;transform:translate(-50%,-50%);display:flex;justify-content:center;align-items:center;position:relative;overflow:hidden;';

        if (clusterOptions && clusterOptions.markerView === 'image' && clusterOptions.markerImage)
        {
            const image = document.createElement('img');
            image.src = normalizeRelativeImagePath(clusterOptions.markerImage);
            image.alt = '';
            image.style = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;';
            circle.style.backgroundColor = 'transparent';
            circle.style.borderRadius = '0';
            circle.appendChild(image);
        }

        if (!clusterOptions || clusterOptions.showCount)
        {
            const text = document.createElement('span');
            text.classList.add('circle-text');
            text.style = 'color:white;font-size:1.5rem;position:relative;z-index:1;';
            text.textContent = count;
            circle.appendChild(text);
        }

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
