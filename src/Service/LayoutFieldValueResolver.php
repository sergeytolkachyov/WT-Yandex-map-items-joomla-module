<?php
/**
 * @package       WT Yandex map items
 * @version    2.3.2
 * @author     Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2026 WebTolk, Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link          https://web-tolk.ru
 * @since      2.3.0
 */

namespace Joomla\Module\Wtyandexmapitems\Site\Service;

\defined('_JEXEC') or die;

/**
 * Resolves a module layout id from Joomla custom field storage values.
 *
 * @since 2.3.0
 */
final class LayoutFieldValueResolver
{
    private const FIELD_TYPE_WT_LAYOUT_SELECT = 'wtlayoutselect';

    /**
     * Resolve a layout id from a Joomla custom field object.
     *
     * @param object $field Joomla custom field object.
     *
     * @return string
     *
     * @since 2.3.0
     */
    public function resolveFromField(object $field): string
    {
        return $this->resolveFromRawValue((string) ($field->type ?? ''), $field->rawvalue ?? '');
    }

    /**
     * Resolve a layout id from a raw stored value and custom field type.
     *
     * @param string $fieldType Joomla custom field type.
     * @param mixed  $rawValue  Raw stored field value.
     *
     * @return string
     *
     * @since 2.3.0
     */
    public function resolveFromRawValue(string $fieldType, mixed $rawValue): string
    {
        if ($fieldType === self::FIELD_TYPE_WT_LAYOUT_SELECT) {
            return $this->resolveWtLayoutSelectRawValue($rawValue);
        }

        return $this->resolveRawLayoutId($rawValue);
    }

    /**
     * Resolve an already layout-shaped raw value.
     *
     * @param mixed $rawValue Raw stored field value.
     *
     * @return string
     *
     * @since 2.3.0
     */
    private function resolveRawLayoutId(mixed $rawValue): string
    {
        if (is_array($rawValue)) {
            $rawValue = reset($rawValue);
        }

        return is_string($rawValue) ? trim($rawValue) : '';
    }

    /**
     * Resolve WT Layout Select JSON storage into a FileLayout layout id.
     *
     * @param mixed $rawValue Raw stored field value.
     *
     * @return string
     *
     * @since 2.3.0
     */
    private function resolveWtLayoutSelectRawValue(mixed $rawValue): string
    {
        $rawValue = $this->resolveRawLayoutId($rawValue);

        if ($rawValue === '') {
            return '';
        }

        $decoded = json_decode($rawValue, true);

        if (!is_array($decoded)) {
            return $this->normalizeLayoutId($rawValue);
        }

        if (isset($decoded['value']) && is_string($decoded['value'])) {
            return $this->normalizeLayoutIdForRender($this->normalizeLayoutId($decoded['value']));
        }

        $basePath = $decoded['basePath'] ?? $decoded['base_path'] ?? '';
        $layout   = $decoded['layout'] ?? '';

        if (!is_string($basePath) || !is_string($layout)) {
            return '';
        }

        $basePath = $this->normalizeFolderPath($basePath);
        $layout   = $this->normalizeLayoutName($layout);

        if ($basePath === '' || $layout === '') {
            return '';
        }

        return $this->normalizeLayoutIdForRender(
            trim(str_replace(['/', '\\'], '.', $basePath) . '.' . str_replace(['/', '\\'], '.', $layout), '.')
        );
    }

    /**
     * Normalize a folder path to a predictable format.
     *
     * @param string $path Raw folder path.
     *
     * @return string
     *
     * @since 2.3.0
     */
    private function normalizeFolderPath(string $path): string
    {
        $path = trim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path));
        $path = preg_replace('#' . preg_quote(DIRECTORY_SEPARATOR, '#') . '+#', DIRECTORY_SEPARATOR, $path) ?: $path;

        if (preg_match('#^[A-Za-z]:[\\\\/]#', $path) === 1) {
            return rtrim($path, DIRECTORY_SEPARATOR);
        }

        return trim(ltrim($path, DIRECTORY_SEPARATOR), DIRECTORY_SEPARATOR);
    }

    /**
     * Normalize a layout filename or relative path without its PHP extension.
     *
     * @param string $layout Raw layout name.
     *
     * @return string
     *
     * @since 2.3.0
     */
    private function normalizeLayoutName(string $layout): string
    {
        $layout = trim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $layout));
        $layout = preg_replace('#' . preg_quote(DIRECTORY_SEPARATOR, '#') . '+#', DIRECTORY_SEPARATOR, $layout) ?: $layout;
        $layout = preg_replace('/\.php$/i', '', $layout) ?: $layout;

        return trim(trim($layout, DIRECTORY_SEPARATOR), '.');
    }

    /**
     * Normalize a dot, slash, or file-shaped layout id.
     *
     * @param string $value Raw layout id value.
     *
     * @return string
     *
     * @since 2.3.0
     */
    private function normalizeLayoutId(string $value): string
    {
        $value = trim($value);
        $value = preg_replace('/\.php$/i', '', $value) ?: $value;
        $value = str_replace(['\\', '/'], '.', $value);
        $value = preg_replace('/\.+/', '.', $value) ?: $value;

        return trim($value, '.');
    }

    /**
     * Normalize a layout id for Joomla FileLayout resolution.
     *
     * @param string $layoutId Dot-separated layout id.
     *
     * @return string
     *
     * @since 2.3.0
     */
    private function normalizeLayoutIdForRender(string $layoutId): string
    {
        $layoutId = trim($layoutId, '.');

        if ($layoutId === '' || $layoutId === 'layouts') {
            return '';
        }

        if (str_starts_with($layoutId, 'layouts.')) {
            return substr($layoutId, strlen('layouts.'));
        }

        return $layoutId;
    }
}
