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

function ZmTag(id, name, color, parent, tree, numUnread) {

	ZmOrganizer.call(this, ZmOrganizer.TAG, id, name, parent, tree, numUnread);
	color = color || ZmTag.DEFAULT_COLOR;
	this.color = color;
};

ZmTag.prototype = new ZmOrganizer;
ZmTag.prototype.constructor = ZmTag;

ZmTag.prototype.toString = 
function() {
	return "ZmTag";
};

// color icons
ZmTag.COLOR_ICON = new Object();
ZmTag.COLOR_ICON[ZmOrganizer.C_ORANGE]	= "TagOrange";
ZmTag.COLOR_ICON[ZmOrganizer.C_BLUE]	= "TagBlue";
ZmTag.COLOR_ICON[ZmOrganizer.C_CYAN]	= "TagCyan";
ZmTag.COLOR_ICON[ZmOrganizer.C_GREEN]	= "TagGreen";
ZmTag.COLOR_ICON[ZmOrganizer.C_PURPLE]	= "TagPurple";
ZmTag.COLOR_ICON[ZmOrganizer.C_RED]		= "TagRed";
ZmTag.COLOR_ICON[ZmOrganizer.C_YELLOW]	= "TagYellow";

// color mini icons
ZmTag.COLOR_MINI_ICON = new Object();
ZmTag.COLOR_MINI_ICON[ZmOrganizer.C_ORANGE]	= "MiniTagOrange";
ZmTag.COLOR_MINI_ICON[ZmOrganizer.C_BLUE]	= "MiniTagBlue";
ZmTag.COLOR_MINI_ICON[ZmOrganizer.C_CYAN]	= "MiniTagCyan";
ZmTag.COLOR_MINI_ICON[ZmOrganizer.C_GREEN]	= "MiniTagGreen";
ZmTag.COLOR_MINI_ICON[ZmOrganizer.C_PURPLE]	= "MiniTagPurple";
ZmTag.COLOR_MINI_ICON[ZmOrganizer.C_RED]	= "MiniTagRed";
ZmTag.COLOR_MINI_ICON[ZmOrganizer.C_YELLOW]	= "MiniTagYellow";

// system tags
ZmTag.ID_ROOT = ZmOrganizer.ID_ROOT;
ZmTag.ID_UNREAD		= 32;
ZmTag.ID_FLAGGED	= 33;
ZmTag.ID_FROM_ME	= 34;
ZmTag.ID_REPLIED	= 35;
ZmTag.ID_FORWARDED	= 36;
ZmTag.ID_ATTACHED	= 37;

ZmTag.DEFAULT_COLOR = ZmOrganizer.DEFAULT_COLOR;

/**
* Tags come from back end as a flat list, and we manually create a root tag, so all tags
* have the root as parent. If tags ever have a tree structure, then this should do what
* ZmFolder does (recursively create children).
*/
ZmTag.createFromJs =
function(parent, obj, tree, sorted) {
	if (obj.id < ZmOrganizer.FIRST_USER_ID[ZmOrganizer.TAG])
		return;
	var tag = new ZmTag(obj.id, obj.name, ZmTag.checkColor(obj.color), parent, tree, obj.u);
	var index = sorted ? ZmOrganizer.getSortIndex(tag, ZmTag.sortCompare) : null;
	parent.children.add(tag, index);

	return tag;
};

ZmTag.sortCompare = 
function(tagA, tagB) {
	var check = ZmOrganizer.checkSortArgs(tagA, tagB);
	if (check != null) return check;

	if (tagA.name.toLowerCase() > tagB.name.toLowerCase()) return 1;
	if (tagA.name.toLowerCase() < tagB.name.toLowerCase()) return -1;
	return 0;
};

ZmTag.checkName =
function(name) {
	var msg = ZmOrganizer.checkName(name);
	if (msg) return msg;

	if (name.indexOf('\\') == 0)
		return AjxMessageFormat.format(ZmMsg.errorInvalidName, name);

	return null;
};

ZmTag.checkColor =
function(color) {
	return ((color != null) && (color >= 0 && color <= ZmTag.MAX_COLOR)) ? color : ZmTag.DEFAULT_COLOR;
};

ZmTag.prototype.create =
function(name, color, callback, errorCallback) {
	color = ZmOrganizer.checkColor(color);
	var soapDoc = AjxSoapDoc.create("CreateTagRequest", "urn:zimbraMail");
	var tagNode = soapDoc.set("tag");
	tagNode.setAttribute("name", name);
	tagNode.setAttribute("color", color);
	this.tree._appCtxt.getAppController().sendRequest({soapDoc: soapDoc, asyncMode: true, errorCallback: errorCallback});
};

ZmTag.prototype.getName = 
function(showUnread, maxLength, noMarkup) {
	if (this.id == ZmOrganizer.ID_ROOT) {
		return ZmMsg.tags;
	} else {
		return ZmOrganizer.prototype.getName.call(this, showUnread, maxLength, noMarkup);
	}
};

ZmTag.prototype.getIcon = 
function() {
	return (this.id == ZmOrganizer.ID_ROOT) ? null : ZmTag.COLOR_ICON[this.color];
};

ZmTag.prototype.notifyCreate =
function(obj) {
	var child = ZmTag.createFromJs(this, obj, this.tree, true);
	child._notify(ZmEvent.E_CREATE);
};

/**
* Tags come from back end as a flat list, and we manually create a root tag, so all tags
* have the root as parent. If tags ever have a tree structure, then this should do what
* ZmFolder does (recursively create children).
*/
ZmTag.createFromJs =
function(parent, obj, tree, sorted) {
	if (obj.id < ZmOrganizer.FIRST_USER_ID[ZmOrganizer.TAG])
		return;
	var tag = new ZmTag(obj.id, obj.name, ZmOrganizer.checkColor(obj.color), parent, tree, obj.u);
	var index = sorted ? ZmOrganizer.getSortIndex(tag, ZmTag.sortCompare) : null;
	parent.children.add(tag, index);

	return tag;
};
