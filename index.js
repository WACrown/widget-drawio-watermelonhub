
const imageContainer = document.querySelector('.fullscreen-image');
const blockId = getBlockIdFromParentDom();
// 从iframe的父Dom获取块ID
function getBlockIdFromParentDom() {
  const parentDom = window.frameElement?.parentElement?.parentElement;
  return parentDom?.getAttribute("data-node-id") || null;
}

function getSvg(blockId) {
    return fetch("/api/file/getFile", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            path: `data/assets/${blockId}-drawio.svg`,
            //path: `data/assets/test1.drawio`,
        }),
    }).then((response) => {
        // 检查响应状态
        if (response.status !== 200) {
            return null;
        }
        return response.blob();
    });
}

function showSvg(blockId) {
    getSvg(blockId).then(blob => {
        if (!blob) return;
        
        // 撤销旧的URL（如果存在）
        if (imageContainer.src) {
            URL.revokeObjectURL(imageContainer.src);
        }
        
        const imageUrl = URL.createObjectURL(blob);
        imageContainer.src = imageUrl;
        
        // 直接在显示的imageContainer上监听加载事件
        imageContainer.onload = function() {
            URL.revokeObjectURL(imageUrl);
            // 清除事件处理器避免内存泄漏
            imageContainer.onload = null;
        };
        
        // 添加错误处理
        imageContainer.onerror = function() {
            console.error("图片加载失败");
            URL.revokeObjectURL(imageUrl);
        };
    });
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    
	const editBtn = document.getElementById('editBtn');

    // 获取块ID
    
    showSvg(blockId);
    editBtn.addEventListener('click', function() {
		// 定义draw.io编辑器的URL，参数embed=1和proto=json是关键
		const drawIoUrl = `iframe.html?siyuan-blockid=${encodeURIComponent(blockId)}`;	
		window.open(drawIoUrl, 'drawio-editor');
	});
    refreshBtn.addEventListener('click', function() {
		showSvg(blockId);
	});
});

