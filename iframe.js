/**
 * Global configuration.
 */
DiagramEditor.prototype.config = null;

DiagramEditor.prototype.blockId = null;

DiagramEditor.prototype.svgDataURL = null;

DiagramEditor.prototype.iframe = null;

DiagramEditor.prototype.blockPath = null;


function DiagramEditor()
{
	this.blockId = DiagramEditor.getBlockId();
	this.iframe = document.getElementById('drawio-iframe');
	// 隐藏Tab栏
	this.config = {css : '.geTabContainer { height: 0px !important; }'};
	this.getSvgDateUrl().then(result => {this.svgDataURL = result;});
	this.getBlockPath().then(path => {this.blockPath = path;});
	
	var self = this;


  	window.addEventListener('message', function(evt)
	{
		if (evt.data && evt.data.length > 0)
		{
			try
			{
				var msg = JSON.parse(evt.data);

				if (msg != null)
				{
					self.handleMessage(msg);
				}
			}
			catch (e)
			{
				console.error(e);
			}
		}
	});

	
};






DiagramEditor.prototype.handleMessage = function(msg)
{
	if (msg.event == 'configure')
	{
		this.configureEditor();
	}
	else if (msg.event == 'init')
	{
		this.initializeEditor();
	}
	else if (msg.event == 'autosave' || msg.event == 'save')
	{
		this.save(msg.xml, true, this.startElement);
	}
	else if (msg.event == 'export')
	{
		this.export(msg);
	}
	else if (msg.event == 'exit')
	{
    	this.exit();
	}

};

DiagramEditor.prototype.postMessage = function(msg)
{
	if (this.iframe != null)
	{
		this.iframe.contentWindow.postMessage(JSON.stringify(msg), '*');
	}
};

/**
 * Posts configure message to editor.
 */
DiagramEditor.prototype.configureEditor = function()
{
	this.postMessage({action: 'configure', config: this.config});
};

/**
 * Posts load message to editor.
 */
DiagramEditor.prototype.initializeEditor = function()
{
	this.postMessage({
		action: 'load',
		autosave: 1,
		modified: 'unsavedChanges',
		title:`${this.blockPath}/${this.blockId}-drawio.svg`,
		xml: this.svgDataURL
		});

};

/**
 * Saves the given data.
 */
DiagramEditor.prototype.save = function()
{

	this.postMessage({
		action: 'export', 
		format:'xmlsvg'
	});

	
};

DiagramEditor.prototype.export = async function(msg)
{
	const code = await this.saveSvgToSiyuan(msg.data, this.blockId + "-drawio.svg");
	if(code == 0){
		this.postMessage({
		action: 'status', 
		messageKey: 'allChangesSaved',
		modified: false
		});
	}
};

DiagramEditor.prototype.exit = function()
{
	window.close();
};


// 获取块ID
DiagramEditor.getBlockId = function() {
  return new URLSearchParams(window.location.search).get("siyuan-blockid");
}



DiagramEditor.prototype.getBlockPath = async function() {
    return fetch("/api/filetree/getHPathByID", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: this.blockId
        }),
    }).then((response) => {
        // 检查响应状态
        if (response.status !== 200 || response == null) {
            return null;
        }
        return response.json();
    })
    .then(msg => {
		return msg.data;});
}




DiagramEditor.prototype.getSvgDateUrl = async function() {
    return fetch("/api/file/getFile", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            path: `data/assets/${this.blockId}-drawio.svg`,
        }),
    }).then((response) => {
        // 检查响应状态
        if (response.status !== 200 || response == null) {
            return null;
        }
        return response.blob();
    })
    .then(originalBlob => originalBlob == null ? null : new Blob([originalBlob], { type: 'image/svg+xml' }))
    .then(blob => blob == null ? null : new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(blob);
    }));
}

DiagramEditor.prototype.saveSvgToSiyuan = async function(base64Data, fileName) {
	// 1. 分离 Base64 数据和 MIME 类型
	const parts = base64Data.split(';base64,');
	const base64String = parts.length > 1 ? parts[1] : base64Data;
	
	// 2. 解码 Base64 字符串
	const byteCharacters = atob(base64String);
	
	// 3. 创建字节数组
	const byteArrays = new Uint8Array(byteCharacters.length);
	for (let i = 0; i < byteCharacters.length; i++) {
		byteArrays[i] = byteCharacters.charCodeAt(i);
	}
	
	// 4. 创建 Blob 对象（指定为 SVG 类型）
	const blob = new Blob([byteArrays], { type: 'image/svg+xml' });
	
	// 5. 创建 File 对象
	const file =  new File([blob], fileName, { type: 'image/svg+xml' });

	const formdata = new FormData();
	formdata.append("path", "/data/assets/"+fileName);
	formdata.append("isDir", false);
	formdata.append("modTime", Date.now());
	formdata.append("file", file);

	return fetch("/api/file/putFile", {
		method: "POST",
		body: formdata,
	})
		.then((response) => {
		return response.json();
		})
		.then((data) => {
		return data.code;
		});
}

DiagramEditor.prototype.isAuthEnable = async function(){
  const reponse = await fetch("/api/attr/getBlockAttrs", {
    body: JSON.stringify({
      id: this.blockId,
    }),
    method: "POST",
  });
  return reponse.status === 401;
}

const diagramEditor = new DiagramEditor();
diagramEditor.isAuthEnable().then(auth => {
		if(auth){
			const { pathname, search } = window.location;
			const url = '/check-auth?to=' + encodeURIComponent(pathname + search);
			window.location.href = url;
		}
	});