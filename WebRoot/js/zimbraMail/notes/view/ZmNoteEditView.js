/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.1
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite Web Client
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2005 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s):
 * 
 * ***** END LICENSE BLOCK *****
 */

function ZmNoteEditView(parent, appCtxt, controller) {
	DwtComposite.call(this, parent, "ZmNoteEditView", DwtControl.ABSOLUTE_STYLE);
	
	this._appCtxt = appCtxt;
	this._controller = controller;
	
	this._createHtml();
}
ZmNoteEditView.prototype = new DwtComposite;
ZmNoteEditView.prototype.constructor = ZmNoteEditView

ZmNoteEditView.prototype.toString =
function() {
	return "ZmNoteView";
};

// Data

ZmNoteEditView.prototype._appCtxt;
ZmNoteEditView.prototype._controller;

// Public methods

ZmNoteEditView.prototype.getController =
function() {
	return this._controller;
};

ZmNoteEditView.prototype.set =
function(note) {
	var callback = new AjxCallback(this, this._setResponse, [note]);
	note.getContent(callback);
};
ZmNoteEditView.prototype._setResponse = function(note) {
	var name = note.name || "";
	this._titleInput.setValue(name);
	this._titleInput.disabled(name != "");

	var content = note.getContent();
	this.setContent(content);
		
	var focusedComp = name == "" ? this._titleInput : this._textArea;
	focusedComp.focus();
};

ZmNoteEditView.prototype.getTitle =
function() {
	return this._titleInput.getValue();
};

ZmNoteEditView.prototype.setFormat = function(format) {
	this._textArea.setFormat(format);
};
ZmNoteEditView.prototype.getFormat = function() {
	return this._textArea.getFormat();
};

ZmNoteEditView.prototype.setContent = function(content) {
	this._textArea.setContent(content);
};
ZmNoteEditView.prototype.getContent =
function() {
	return this._textArea.getContent();
};

ZmNoteEditView.prototype.getSelection =
function() {
	return this._controller.getNote();
};


ZmNoteEditView.prototype.addSelectionListener = function(listener) { /*TODO*/ };
ZmNoteEditView.prototype.addActionListener = function(listener) { /*TODO*/ };

ZmNoteEditView.prototype.setBounds = 
function(x, y, width, height) {
	DwtComposite.prototype.setBounds.call(this, x, y, width, height);

	var size = Dwt.getSize(this._inputEl);
	this._textArea.setSize(width, height - size.y);
};

// Protected methods

ZmNoteEditView.prototype._createHtml =
function() {
	// create components
	this._titleInput = new DwtInputField({parent:this});
	this._titleInput.setRequired(true);
	var titleInputEl = this._titleInput.getInputElement();
	titleInputEl.size = 50;
		
	this._textArea = new ZmNoteEditor(this, null, null, DwtHtmlEditor.HTML, this._appCtxt, this._controller);
	// HACK: Notes are always HTML format, regardless of the COS setting.
	this._textArea.isHtmlEditingSupported = new Function("return true");
	var textAreaEl = this._textArea.getHtmlElement();
	textAreaEl.style.width = "100%";
	textAreaEl.style.height = "100%";

	// build html
	this._inputEl = document.createElement("TABLE");
	var table = this._inputEl;
	table.cellSpacing = 0;
	table.cellPadding = 3;
	table.width = "100%";
	
	var row = table.insertRow(table.rows.length);
	var labelCell = row.insertCell(row.cells.length);
	labelCell.width = "1%";
	labelCell.className = "Label";
	labelCell.innerHTML = ZmMsg.titleLabel;
	var inputCell = row.insertCell(row.cells.length);
	inputCell.appendChild(this._titleInput.getHtmlElement());
	
	var element = this.getHtmlElement();
	element.appendChild(table);
	element.appendChild(textAreaEl);
};

//
// ZmNoteEditor class
//

function ZmNoteEditor(parent, posStyle, content, mode, appCtxt, controller) {
	if (arguments.length == 0) return;
	ZmHtmlEditor.call(this, parent, posStyle, content, mode, appCtxt)
	this._controller = controller;
}
ZmNoteEditor.prototype = new ZmHtmlEditor;
ZmNoteEditor.prototype.constructor = ZmNoteEditor;

ZmNoteEditor.prototype.toString = function() {
	return "ZmNoteEditor";
};

// Constants

ZmNoteEditor.KEY_FORMAT = "format";

ZmNoteEditor.HTML_SOURCE = "htmlsrc";
ZmNoteEditor.MEDIA_WIKI = "mediawiki";
ZmNoteEditor.RICH_TEXT = "richtext";
ZmNoteEditor.TWIKI = "twiki";

ZmNoteEditor.DEFAULT = ZmNoteEditor.RICH_TEXT;

ZmNoteEditor._MODES = {};
ZmNoteEditor._MODES[ZmNoteEditor.HTML_SOURCE] = DwtHtmlEditor.TEXT;
ZmNoteEditor._MODES[ZmNoteEditor.MEDIA_WIKI] = DwtHtmlEditor.TEXT;
ZmNoteEditor._MODES[ZmNoteEditor.RICH_TEXT] = DwtHtmlEditor.HTML;
ZmNoteEditor._MODES[ZmNoteEditor.TWIKI] = DwtHtmlEditor.TEXT;

ZmNoteEditor._WIKI2HTML = {};
ZmNoteEditor._WIKI2HTML[ZmNoteEditor.MEDIA_WIKI] = function(content) {
	return ZmWikiConverter.convert(content, MediaWiki.rules);
};
ZmNoteEditor._WIKI2HTML[ZmNoteEditor.TWIKI] = function(content) {
	return ZmWikiConverter.convert(content, TWiki.rules);
};

ZmNoteEditor._HTML2WIKI = {};
ZmNoteEditor._HTML2WIKI[ZmNoteEditor.MEDIA_WIKI] = null; // TODO
ZmNoteEditor._HTML2WIKI[ZmNoteEditor.TWIKI] = null; // TODO

// Data

ZmNoteEditor.prototype._format = ZmNoteEditor.DEFAULT;

// Public methods

ZmNoteEditor.prototype.setFormat = function(format) {
	this._format = format;
	this.setMode(ZmNoteEditor._MODES[format]);
};
ZmNoteEditor.prototype.getFormat = function() {
	return this._format;
};

ZmNoteEditor.prototype.setMode = function(mode) {
	if (mode != this._mode) {
		ZmHtmlEditor.prototype.setMode.call(this, mode);
		this.setSize(this._oldW, this._oldH);
	}
};

ZmNoteEditor.prototype.setSize = function(w, h) {
	// NOTE: We need to save our explicitly-set size so that we can
	//       resize the control properly when the mode is changed.
	//       Querying the size later returns the wrong values for
	//       some reason. REVISIT!
	this._oldW = w;
	this._oldH = h;
	ZmHtmlEditor.prototype.setSize.apply(this, arguments);
};

ZmNoteEditor.prototype.setContent = function(content) {
	var converter = ZmNoteEditor._HTML2WIKI[this._format];
	if (converter) {
		// TODO
	}
	ZmHtmlEditor.prototype.setContent.call(this, content);
};
ZmNoteEditor.prototype.getContent = function() {
	var content = ZmHtmlEditor.prototype.getContent.call(this);
	var converter = ZmNoteEditor._WIKI2HTML[this._format];
	if (converter) {
		content = converter(content);
	}
	return content;
};

// Protected methods

ZmNoteEditor.prototype._embedHtmlContent =
function(html) {
	return html;
};

ZmNoteEditor.prototype._createToolbars = function() {
	ZmHtmlEditor.prototype._createToolbars.call(this);
	if (!this._wikiToolBar) {
		this._createWikiToolBar(this);
	}
};

ZmNoteEditor.prototype._createToolBar2 = function(parent) {
	ZmHtmlEditor.prototype._createToolBar2.call(this, parent);

	var button = new DwtButton(this._toolbar2, null, "TBButton")
	button.setImage("ImageDoc");
	button.addSelectionListener(new AjxListener(this, this._insertImageListener));
};

ZmNoteEditor.prototype._createWikiToolBar = function(parent) {
	var toolbar = this._wikiToolBar = new ZmToolBar(parent, "ToolBar", DwtControl.RELATIVE_STYLE, 2);
	toolbar.setVisible(this._mode == DwtHtmlEditor.HTML);
	
	var listener = new AjxListener(this, this._wikiToolBarListener);
	
	for (var name in ZmNoteView.WIKLETS) {
		var wiklet = ZmNoteView.WIKLETS[name];
		var button = new DwtButton(toolbar, null, "TBButton");
		button.setText(wiklet.label || name);
		button.setToolTipContent(wiklet.tooltip);
		button.setData("wiklet", name);
		button.addSelectionListener(listener);
	}
	
	this._toolbars.push(toolbar);
};

ZmNoteEditor.prototype._insertImageListener = function(event) {
	var note = this._controller.getNote();

	var dialog = this._appCtxt.getUploadDialog();
	dialog.setFolderId(note.folderId || ZmNote.DEFAULT_FOLDER);
	if (!this._insertImageCallback) {
		this._insertImageCallback = new AjxCallback(this, this._insertImageByIds);
	}
	dialog.setCallback(this._insertImageCallback);
	dialog.popup();
};

ZmNoteEditor.prototype._insertImageByIds = function(ids) {
	var loc = document.location;
	var uname = this._appCtxt.get(ZmSetting.USERNAME);
	for (var i = 0; i < ids.length; i++) {
		var id = ids[i];
		var src = [
			loc.protocol,"//",loc.host,"/service/home/~",uname,"/?id=",id
		].join("");

		this.insertImage(src);
	}
};

ZmNoteEditor.prototype._wikiToolBarListener = function(event) {
	var name = event.item.getData("wiklet");
	/***
	var node = document.createElement("DIV");
	node.style.backgroundColor = "black";
	node.style.color = "white";
	node.innerHTML = name;
	/***
	var button = new DwtButton(this);
	button.setText(name);
	button.addSelectionListener(new AjxListener(this, this._configureWiklet));
	var node = button.getHtmlElement();
	/***/
	var a = [
		"{{", name,
	];
	if (ZmNoteView.WIKLETS[name].params) {
		a.push("|", ZmNoteView.WIKLETS[name].params);
	}
	a.push("}}");
	var node = document.createTextNode(a.join(""));
	/***/
	this._insertNodeAtSelection(node);
};
/***
ZmNoteEditor.prototype._configureWiklet = function(event) {
	alert("click!");
};
/***/

ZmNoteEditor.prototype._getInitialStyle = function(useDiv) {
	return "";
};