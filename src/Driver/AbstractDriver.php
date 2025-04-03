<?php
/**
 * @package    WT Yandex map items
 * @version    2.0.1
 * @author     Sergey Tolkachyov
 * @copyright  Copyright (c) 2022 - 2025 Sergey Tolkachyov. All rights reserved.
 * @license    GNU/GPL license: https://www.gnu.org/copyleft/gpl.html
 * @link       https://web-tolk.ru
 * @since      2.0.0
 */

namespace Joomla\Module\Wtyandexmapitems\Site\Driver;

use Joomla\CMS\Application\CMSApplicationInterface;
use Joomla\Registry\Registry;
use stdClass;

// No direct access to this file
defined('_JEXEC') or die;

abstract class AbstractDriver
{
	/**
	 * Current driver context. For example, 'com_content.article'
	 *
	 * @var string
     *
	 * @since 2.0.0
	 */
	public $context = '';

	/**
	 * Source params
	 *
	 * @var Registry
     *
	 * @since 2.0.0
	 */
	public $params;

	/**
	 * Application instance
	 *
	 * @var CMSApplicationInterface
     *
	 * @since 2.0.0
	 */
	public $app;

	/**
	 * Driver constructor
	 *
	 * @param string $context
     * @param Registry $params
     * @param CMSApplicationInterface $app
     *
	 * @since 2.0.0
	 */
	public function __construct(string $context, Registry $params, CMSApplicationInterface $app)
	{
		$this->context = $context;
		$this->params = $params;
		$this->app = $app;
	}

	/**
	 * Get item data
	 *
	 * @return array Item data
     *
	 * @since 2.0.0
	 */
	public function getItems(): array
	{
		return [];
	}

    /**
     * Get item data from id
     *
     * @param int $id Item id
     *
     * @return stdClass Item data
     *
     * @since 2.0.0
     */
    public function getItem(int $id): stdClass
    {
        return new stdClass();
    }
}