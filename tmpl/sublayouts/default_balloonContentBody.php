<?php
/**
 * @package         WT Yandex Map items
 *
 * @copyright   (C) 2022 Sergey Tolkachyov
 * @link            https://web-tolk.ru
 * @license         GNU General Public License version 2 or later
 */
/**
 * @var $displayData array Array of data to display
 */

use Joomla\CMS\Factory;
use Joomla\CMS\Filter\OutputFilter;
use Joomla\CMS\HTML\HTMLHelper;
use Joomla\CMS\Language\Text;

defined('_JEXEC') or die;

/**
 * В тексте метки отображаются данные поля - есть название поле и содержимое.
 * Рендерим и то и то.
 * Если приходит полный или вступительный текст статьи - просто возвращаем текст.
 */

$data = $displayData['data'];
$params = $displayData['module_params'];

if($displayData['image'] && $displayData['image']['imageSrc'])
{
	$img_attribs = [
			'class' => 'img-fluid',
			'loading' => 'lazy'
	];
	echo HTMLHelper::image($displayData['image']['imageSrc'], $displayData['image']['imageAlt'],$img_attribs);
}


if(is_array($data)): ?>
	<h4><?php echo $data['title'];?> </h4>
	<?php echo $data['text'];?>
<?php else :?>
	<?php echo $data; ?>
<?php endif;
// Ссылка "Подробнее" для МАТЕРИАЛОВ
if($params->get('show_article_readmore','1') == 1 && !empty($displayData['link']) && !empty($displayData['link_text'])):
	$link_attribs = [
			'class' => 'btn btn-sm btn-primary'
	];
	echo HTMLHelper::link(OutputFilter::ampReplace(htmlspecialchars($displayData['link'], ENT_COMPAT, 'UTF-8', false)),$displayData['link_text'], $link_attribs);
endif;
