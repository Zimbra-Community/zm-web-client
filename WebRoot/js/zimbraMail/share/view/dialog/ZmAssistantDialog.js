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

/**
*
* @param appCtxt	[ZmAppCtxt]			the app context
*/
function ZmAssistantDialog(appCtxt) {

//	DwtDialog.call(this, appCtxt.getShell(), "ZmAssistantDialog", "Zimbra Assistant");
	ZmQuickAddDialog.call(this, appCtxt.getShell(), null, null, []);

	this._appCtxt = appCtxt;

	this.setTitle("Zimbra Assistant");
	this.setContent(this._contentHtml());
	this._initContent();
	this._fields = {};	
	this._msgDialog = this._appCtxt.getMsgDialog();
	this.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._okButtonListener));
	this._objectManager = new ZmObjectManager(null, this._appCtxt, null);		

	// only trigger matching after a sufficient pause
	this._pasrseInterval = this._appCtxt.get(ZmSetting.AC_TIMER_INTERVAL);
	this._parseTimedAction = new AjxTimedAction(this, this._parseAction);
	this._parseActionId = -1;
};

ZmAssistantDialog.prototype = new ZmQuickAddDialog;
ZmAssistantDialog.prototype.constructor = ZmAssistantDialog;

/**
*/
ZmAssistantDialog.prototype.popup =
function() {
	this._commandEl.value = "";
//	this._fields = {};	
	this._setDefaultAction();

	DwtDialog.prototype.popup.call(this);
	this._commandEl.focus();
};

/**
* Clears the conditions and actions table before popdown so we don't keep
* adding to them.
*/
ZmAssistantDialog.prototype.popdown =
function() {
	DwtDialog.prototype.popdown.call(this);
};

/*
* Returns HTML that forms the basic framework of the dialog.
*/
ZmAssistantDialog.prototype._contentHtml =
function() {
	var html = new AjxBuffer();
	this._tableId = Dwt.getNextId();
	
	html.append("<table cellspacing=3 border=0 width=400 id='", this._tableId, "'>");
	this._commandId = this._addCommand(html, "");
	html.append("<td colspan=3><hr></td>");
	html.append("</table>");	
	return html.toString();
};

ZmAssistantDialog.prototype._initContent =
function() {
	this._commandEl = document.getElementById(this._commandId);
	this._tableEl = document.getElementById(this._tableId);	
	Dwt.associateElementWithObject(this._commandEl, this);
	this._commandEl.onkeyup = ZmAssistantDialog._keyUpHdlr;
};

ZmAssistantDialog._keyUpHdlr =
function(ev) {
	var keyEv = DwtShell.keyEvent;
	keyEv.setFromDhtmlEvent(ev);
	var obj = keyEv.dwtObj;
	obj._commandUpdated();
//	DBG.println("value = "+obj._commandEl.value);
};

ZmAssistantDialog.prototype._commandUpdated =
function() {
	// reset timer on key activity
	if (this._parseActionId != -1) 	AjxTimedAction.cancelAction(this._parseActionId);
	this._parseActionId = AjxTimedAction.scheduleAction(this._parseTimedAction, this._parseInterval);
}

ZmAssistantDialog.prototype._parseAction =
function() {
	var cmd = this._commandEl.value.replace(/^\s*/, '');
	var match = cmd.match(/^(appt|contact|new|empty)\b\s*/);
	if (!match) {
			this._setDefaultAction();
			return;
	}
	var args = cmd.substring(match[0].length);
	var mainCommand = match[1];
	if (this._mainCommand != mainCommand) {
		this._fieldsToDisplay({});
		this._mainCommand = mainCommand;
	}

	if (mainCommand == 'appt')
		this._newApptCommand(args);
	else if (mainCommand == 'contact') 
		this._newContactCommand(args);		
	else if (mainCommand == 'new')
		this._newCommand(args);
	else if (mainCommand == 'empty')
		this._emptyCommand(args);	
	else {
		this._setDefaultAction();		
	}
};

ZmAssistantDialog.prototype._emptyCommand =
function(args) {
	var match = args.match(/\s*(\w+)\s*/);
	if (!match) return;
	var obj = match[1];
	//DBG.println("object = "+obj);
	args = args.substring(match[0].length);
	if (obj == 'trash') {
		this._setAction(ZmMsg.emptyTrash, "Trash");
	} else if (obj == 'junk') {
		this._setAction(ZmMsg.emptyJunk, "SpamFolder");
	} else {
		this._setDefaultAction();
	}
}

ZmAssistantDialog.prototype._newCommand =
function(args) {
	DBG.println("new = "+args);
	var match = args.match(/\s*(\w+)\s*/);
	if (!match) return;
	var obj = match[1];
	DBG.println("object = "+obj);
	args = args.substring(match[0].length);
	if (obj == 'appt') this._newApptCommand(args);
	else if (obj == 'note') this._newNoteCommand(args);	
	else if (obj == 'message') this._newMessageCommand(args);	
	else if (obj == 'm')  { 
		this._commandEl.value += "essage ";
		this._newMessageCommand("");
	}
	else this._setDefaultAction();
}

ZmAssistantDialog.prototype._matchTime =
function(args) {
	var hour, minute, ampm = null;
	var match1 = args.match(/\s*(\d+):(\d\d)(?:\s*(AM|PM))?\s*/i);
	var match2 = args.match(/\s*(\d+)(AM|PM)\s*/i);	
	// take the first match
	if (match1 && match2) {
		if  (match1.index < match2.index) match2 = null;
		else match1 = null;
	}
	if (match1) {
		hour = parseInt(match1[1]);
		minute = parseInt(match1[2]);
		if (match1[3]) ampm = match1[3].toLowerCase();
		args = args.replace(match1[0], " ");
	} else if (match2) {
		hour = parseInt(match2[1]);
		minute = 0;
		ampm = match2[2].toLowerCase();	
		args = args.replace(match2[0], " ");
	} else {
		return null;
	}

	if (ampm == 'pm' && hour < 12) hour += 12;
	else if (ampm == 'am' && hour == 12) hour = 0;

	return {hour: hour, minute: minute, args: args };
};

/**
 * 
 * (...)                 matched as notes, stripped out
 * [...]                 matched as location, stripped out
 * {date-spec}           first matched pattern is "start date", second is "end date"
 * {time-spec}           first matched pattern is "start time", second is "end time"
 * repat {repeat-spec}   recurrence rule
 * calendar {cal-name}   calendar to add appt to
 * invite {e1,e2,e3}     email addresses to invite (ideally would auto-complete)
 * subject "..."         explicit subject
 * 
 * everything renaming is the subject, unless subject was explicit
 * 
 * example:
 * 
 * lunch 12:30 PM next friday with satish (to discuss future release) [CPK, Palo Alto]
 * 
 * "12:30 PM" matched as a time, saved as "start time" * 
 * "next friday" matches a date, so is stripped out and saved as "start date"
 * (...) matched as notes, stripped out and saved as "notes"
 * [...] matched as location
 * 
 * everything left "lunch with satish" is taken as subject
 * 
 */
 	
ZmAssistantDialog.prototype._newApptCommand =
function(args) {
	this._setActionField(ZmMsg.newAppt, "NewAppointment");

	DBG.println("args = "+args);
	var startDate = new Date();
	var endDate = null;
	var match;

//	DBG.println("args = "+args);

	var loc = null;
	match = args.match(/\s*\[([^\]]*)\]?\s*/);	
	if (match) {
		loc = match[1];
		args = args.replace(match[0], " ");
	}

	var notes = null;
	match = args.match(/\s*\(([^)]*)\)?\s*/);
	if (match) {
		notes = match[1];
		args = args.replace(match[0], " ");
	}

	startDate.setMinutes(0);
	var startTime = this._matchTime(args);
	if (startTime) {
		startDate.setHours(startTime.hour, startTime.minute);
		args = startTime.args;
	}

	// look for an end time
	var endTime = this._matchTime(args);
	if (endTime) {
		args = endTime.args;
	}

	// look for start date
	match = this._objectManager.findMatch(args, ZmObjectManager.DATE);
	if (match) {
		args = args.replace(match[0], " ");
		startDate = match.context.date;
		if (startTime) startDate.setHours(startTime.hour, startTime.minute);
	}
	
	// look for end date
	match = this._objectManager.findMatch(args, ZmObjectManager.DATE);
	if (match) {
		args = args.replace(match[0], " ");
		endDate = match.context.date;
		if (endTime != null) endDate.setHours(endTime.hour, endTime.minute);
		else if (startTime != null) endDate.setHours(startTime.hour, startTime.minute);
	} else {
		if (endTime) {
			endDate = new Date(startDate.getTime());
			if (endTime != null) endDate.setHours(endTime.hour, endTime.minute);			
		} else if (startTime) {
			endDate = new Date(startDate.getTime() + 1000 * 60 * 60);
		}
	}
	
	var subject = null;
	match = args.match(/\s*\"([^\"]*)\"?\s*/);
	if (match) {
		subject = match[1];
		args = args.replace(match[0], " ");
	}

	var repeat = null;
	match = args.match(/\s*repeats?\s+(\S+)\s*/);	
	if (match) {
		repeat = match[1];
		args = args.replace(match[0], " ");
	}

	match = args.match(/\s*invite\s+(\S+)\s*/);
	if (match) {
		args = args.replace(match[0], " ");
	}

	if (subject == null) {
		subject = args.replace(/^\s+/, "").replace(/\s+$/, "").replace(/\s+/g, ' ');
	}

	var subStr = AjxStringUtil.convertToHtml(subject == "" ? "\"enclose subject in quotes or just type\"" : subject);
	var locStr = AjxStringUtil.convertToHtml(loc == null ? "[enclose location in brackets]" : loc);
	var notesStr = AjxStringUtil.convertToHtml(notes == null ? "(enclose notes in parens)" : notes);
	this._setField(ZmMsg.subject, subStr, subject == "", false);
	this._setDateFields(startDate, startTime, endDate, endTime);
	this._setField(ZmMsg.location, locStr, loc == null, false);	
	this._setField(ZmMsg.notes, notesStr, notes == null, false);
	this._setOptField(ZmMsg.repeat, repeat, false, true);
	return;

};

ZmAssistantDialog._ADDRESS = "ZmAssistantDialogAddress";
	
ZmAssistantDialog.prototype._matchTypedObject =
function(args, obj, defaultType) {
	
	var match = obj == ZmAssistantDialog._ADDRESS ? args.match(/\s*\[([^\]]*)\]?\s*/) : this._objectManager.findMatch(args, obj);
	if (!match) return null;

	var type = defaultType;
	var matchType = null;
	if (match.index > 0) {
		// check for a type
		var targs = args.substring(0, match.index);
		matchType = targs.match(/\b([0-9a-z]{1,2}):\s*$/i);
		if (matchType) {
			type = matchType[1];
			if (type == 'f') type = 'wf'; // map f to wf internally
		}
	}
	if (matchType) {
		args = args.replace(matchType[0]+match[0], " ");
	} else {
		args = args.replace(match[0], " ");
	}
	var data =  obj == ZmAssistantDialog._ADDRESS ? match[1] : match[0];
	return {data: data, args: args, type: type};
}

ZmAssistantDialog._URL_ORDER = [ 'w', 'h', 'o' ];
ZmAssistantDialog._URL_FIELDS = {
	 w: ZmMsg.AB_WORK_URL,
	 h: ZmMsg.AB_HOME_URL,
 	 o: ZmMsg.AB_OTHER_URL
};

ZmAssistantDialog._ADDR_ORDER = [ 'w', 'h', 'o' ];
ZmAssistantDialog._ADDR_FIELDS = {
	 w: ZmMsg.AB_ADDR_WORK,
	 h: ZmMsg.AB_ADDR_HOME, 
 	 o: ZmMsg.AB_ADDR_OTHER
};

ZmAssistantDialog._EMAIL_ORDER = [ '1', '2', '3' ];
ZmAssistantDialog._EMAIL_FIELDS = {
	 '1': ZmMsg.AB_FIELD_email,
	 '2': ZmMsg.AB_FIELD_email2,
 	 '3': ZmMsg.AB_FIELD_email3
};
 
ZmAssistantDialog._PHONE_ORDER = [ 'w', 'w2', 'm', 'p', 'wf', 'a', 'c', 'co', 'cb', 'h', 'h2', 'hf', 'o', 'of' ];
ZmAssistantDialog._PHONE_FIELDS = {
	 w: ZmMsg.AB_FIELD_workPhone,
	w2: ZmMsg.AB_FIELD_workPhone2, 
	 m: ZmMsg.AB_FIELD_mobilePhone,
	 p: ZmMsg.AB_FIELD_pager,
	wf: ZmMsg.AB_FIELD_workFax,
	 a: ZmMsg.AB_FIELD_assistantPhone,
	 c: ZmMsg.AB_FIELD_carPhone,
	co: ZmMsg.AB_FIELD_companyPhone,
	cb: ZmMsg.AB_FIELD_callbackPhone,
	 h: ZmMsg.AB_FIELD_homePhone,
	h2: ZmMsg.AB_FIELD_homePhone2,
	hf: ZmMsg.AB_FIELD_homeFax,
	 o: ZmMsg.AB_FIELD_otherPhone,
	of: ZmMsg.AB_FIELD_otherFax
};

ZmAssistantDialog.prototype._newContactCommand =
function(args) {
	this._setActionField(ZmMsg.newContact, "NewContact");
	var match;

	var addresses = {};
	while (match = this._matchTypedObject(args, ZmAssistantDialog._ADDRESS, 'w')) {
		addresses[match.type] = match;
		args = match.args;
	}


	var phones = {};
	// look for phone numbers
	while (match = this._matchTypedObject(args, ZmObjectManager.PHONE, 'w')) {
		phones[match.type] = match;
		args = match.args;
	}

	var urls = {};
	// look for urls
	while (match = this._matchTypedObject(args, ZmObjectManager.URL, 'w')) {
		urls[match.type] = match;
		args = match.args;
	}

	var emails = {};
	// look for urls
	while (match = this._matchTypedObject(args, ZmObjectManager.EMAIL, '1')) {
		emails[match.type] = match;
		args = match.args;
	}
	
	var repeat = null;
	match = args.match(/\s*repeats?\s+(\S+)\s*/i);	
	if (match) {
		repeat = match[1];
		args = args.replace(match[0], " ");
	}

	var notes = null;
	match = args.match(/\s*\(([^)]*)\)?\s*/);
	if (match) {
		notes = match[1];
		args = args.replace(match[0], " ");
	}

//	var title = null;
//	match = args.match(/\s*\"([^\"]*)\"?\s*/);
//	if (match) {
//		title = match[1];
//		args = args.replace(match[0], " ");
//	}

//	var company = null;
//	match = args.match(/\s*\{([^\}]*)\}?\s*/);
//	if (match) {
//		company = match[1];
//		args = args.replace(match[0], " ");
//	}

	var remaining = args.replace(/^\s+/, "").replace(/\s+$/, "").replace(/\s+/g, ' ').split(",", 3);
	var fullName = remaining[0];
	var title = remaining[1] ? remaining[1] : "";
	var company = remaining[2] ? remaining[2] : "";	

//	var subStr = AjxStringUtil.convertToHtml(subject == "" ? "\"enclose subject in quotes or just type\"" : subject);

	this._setField(ZmMsg.AB_FIELD_fullName, fullName == "" ? "type to enter fullname, title, company" : fullName, fullName == "", true);
	this._setOptField(ZmMsg.AB_FIELD_jobTitle, title, false, true, ZmMsg.AB_FIELD_fullName);
	this._setOptField(ZmMsg.AB_FIELD_company, company, false, true, ZmMsg.AB_FIELD_fullName);
	
	match = emails['1'];
	var email = match ? match.data : null;
	this._setField(ZmMsg.AB_FIELD_email, email == null ? "(enter an email address)" : email, email == null, true);
	for (var i=0; i < ZmAssistantDialog._EMAIL_ORDER.length; i++) {
		var key = ZmAssistantDialog._EMAIL_ORDER[i];
		if (key == '1') continue;
		var data = emails[key];
		this._setOptField(ZmAssistantDialog._EMAIL_FIELDS[key], data ? data.data : null, false, true, ZmMsg.AB_FIELD_email);
	}

	//match = phones['w'];
	//var workPhone = match ? match.data : null;
	//this._setField(ZmMsg.AB_FIELD_workPhone, workPhone == null ? "(enter work phone)" : workPhone, workPhone == null, true);
	for (var i=0; i < ZmAssistantDialog._PHONE_ORDER.length; i++) {
		var key = ZmAssistantDialog._PHONE_ORDER[i];
		var data = phones[key];
		this._setOptField(ZmAssistantDialog._PHONE_FIELDS[key], data ? data.data : null, false, true);
	}
	
	var notesStr = AjxStringUtil.convertToHtml(notes == null ? "(enclose notes in parens)" : notes);
	this._setField(ZmMsg.notes, notesStr, notes == null, false);
	
	for (var i=0; i < ZmAssistantDialog._URL_ORDER.length; i++) {
		var key = ZmAssistantDialog._URL_ORDER[i];
		var data = urls[key];
		this._setOptField(ZmAssistantDialog._URL_FIELDS[key], data ? data.data : null, false, true);
	}
	
	for (var i=0; i < ZmAssistantDialog._ADDR_ORDER.length; i++) {
		var key = ZmAssistantDialog._ADDR_ORDER[i];
		var data = addresses[key];
		var addr = data ?  AjxStringUtil.convertToHtml(data.data) : null;
		this._setOptField(ZmAssistantDialog._ADDR_FIELDS[key], addr, false, false);
	}

	
//	this._setOptField(ZmMsg.repeat, repeat, false, true);
	return;


};

ZmAssistantDialog.prototype._newNoteCommand =
function(args) {
	this._setAction("New Note", "NewNote");
	DBG.println("args = "+args);

	var fields = {};
	
	this._setTextField("Note", args, null, null, "300px");
	fields["Note"] = 1;
	this._fieldsToDisplay(fields);
};
	
ZmAssistantDialog.prototype._newMessageCommand =
function(args) {
	this._setAction(ZmMsg.newEmail, "NewMessage");
	DBG.println("args = "+args);

	var fields = {};

	args = this._genericWordField("To", "to", args, fields);
	args = this._genericWordField("Cc", "cc", args, fields);
	args = this._genericTextField("Subject", "subject", args, fields);	
	
//	args = this._genericTextField("Body", "body", args, fields);		
	this._setTextField("Body", args, null, null, "300px");
	fields["Body"] = 1;

	this._fieldsToDisplay(fields);
};

ZmAssistantDialog.prototype._clearField = 
function(title) {
	var fieldData = this._fields[title];
	if (fieldData) {
		fieldData.rowEl.parentNode.removeChild(fieldData.rowEl);
		delete this._fields[title];
	}
}

ZmAssistantDialog.prototype._setOptField = 
function(title, value, isDefault, htmlEncode, afterRowTitle, titleAlign) {
	if (value && value != "") {
		this._setField(title, value, isDefault, htmlEncode, afterRowTitle, titleAlign);
	} else {
		this._clearField(title);
	}
}

ZmAssistantDialog.prototype._setField = 
function(title, value, isDefault, htmlEncode, afterRowTitle, titleAlign) {
	var color = isDefault ? 'gray' : 'black';
	var fontStyle = isDefault ? 'italic' : 'normal';
	var fieldData = this._fields[title];
	if (htmlEncode) value = AjxStringUtil.htmlEncode(value);
	if (fieldData) {
		var divEl = document.getElementById(fieldData.id);
		divEl.innerHTML = value;
		if (color) divEl.style.color = color;
		if (fontStyle) divEl.style.fontStyle = fontStyle;
	} else {
		var html = new AjxBuffer();
		var id = Dwt.getNextId();
		html.append("<td valign='", titleAlign ? titleAlign : "top", "' class='ZmApptTabViewPageField'>", AjxStringUtil.htmlEncode(title), ":</td>");
		html.append("<td><div id='", id, "'");
		if (color||fontStyle) {
			html.append(" style='");
			if (color) html.append("color: ", color, ";")
			if (fontStyle) html.append(" font-style: ", fontStyle, ";")
			html.append("' ");			
		}
		html.append(">", value, "</div></td>");
		var rowIndex = -1;
		if (afterRowTitle) {
			var afterRow = this._fields[afterRowTitle];
			if (afterRow) rowIndex = afterRow.rowEl.rowIndex+1;
		}
		var row = this._tableEl.insertRow(rowIndex);
		row.innerHTML = html.toString();
		this._fields[title] = { id: id, rowEl: row };
	}
};

ZmAssistantDialog.prototype._setDateFields = 
function(startDate, startTime, endDate, endTime) {
	var startDateValue = DwtCalendar.getDateFullFormatter().format(startDate);
	var sameDay = false;
	var html = new AjxBuffer();
	html.append("<table border=0 cellpadding=0 cellspacing=0>");
	html.append("<tr>");
	html.append("<td>", AjxStringUtil.htmlEncode(startDateValue), "</td>");
	if (startTime) {
		var startTimeValue = AjxDateUtil.computeTimeString(startDate);
		html.append("<td></td><td>&nbsp;</td><td>@</td><td>&nbsp;</td>");
		html.append("<td>", AjxStringUtil.htmlEncode(startTimeValue), "</td>");
		sameDay = endDate && endDate.getFullYear() == startDate.getFullYear() && 
			endDate.getMonth() == startDate.getMonth() && endDate.getDate() == startDate.getDate();
		if (sameDay) {
			var endTimeValue = AjxDateUtil.computeTimeString(endDate);
			html.append("<td>&nbsp;-&nbsp;</td>");
			html.append("<td>", AjxStringUtil.htmlEncode(endTimeValue), "</td>");
		}
	}
	html.append("</tr></table>");	
	var doEnd = (endDate && !sameDay);
	
	if (doEnd) {
		this._clearField(ZmMsg.time);
		this._setField(ZmMsg.startTime, html.toString(), false, false, ZmMsg.subject);
		
		html.clear();
		var endDateValue = DwtCalendar.getDateFullFormatter().format(endDate);
			html.append("<table border=0 cellpadding=0 cellspacing=0>");		
		html.append("<tr>");
		html.append("<td>", AjxStringUtil.htmlEncode(endDateValue), "</td>");
		if (startTime) { // display end time if a startTime was specified
			var endTimeValue = AjxDateUtil.computeTimeString(endDate);
			html.append("<td></td><td>&nbsp;</td><td>@</td><td>&nbsp;</td>");
			html.append("<td>", AjxStringUtil.htmlEncode(endTimeValue), "</td>");
		}
		html.append("</tr></table>");
		this._setField(ZmMsg.endTime, html.toString(), false, false, ZmMsg.startTime);
		
	} else {
		this._setField(ZmMsg.time, html.toString(), false, false, ZmMsg.subject);
		this._clearField(ZmMsg.startTime);
		this._clearField(ZmMsg.endTime);		
	}
};

ZmAssistantDialog.prototype._setActionField = 
function(value, icon) {
	var html = new AjxBuffer();
	html.append("<table><tr>");
	html.append("<td>", AjxStringUtil.htmlEncode(value), "</td>");	
	html.append("<td>", AjxImg.getImageHtml(icon), "</td>");
	html.append("</<tr></table>");
	this._setField(ZmMsg.action, html, false, false, null, 'middle');
};

ZmAssistantDialog.prototype._setDefaultAction = 
function() {
	this._fieldsToDisplay({});		
	this._setField(ZmMsg.action, "available actions: appt, contact, empty, message",  true, true, null, 'middle');
};	
	
ZmAssistantDialog.prototype._setAction = 
function(value, icon) {
	if (this._actionValue == value) return;
	this._actionValue = value;

	if (value == null) {
		if (this._actionRowEl != null) {
			this._actionHrEl.parentNode.removeChild(this._actionHrEl);
			this._actionRowEl.parentNode.removeChild(this._actionRowEl);
			this._actionHrEl = null;
			this._actionRowEl = null;
			this._fieldsToDisplay({});
		}
		return;	
	}

	if (this._actionRowEl == null) {
		this._actionHrEl = this._tableEl.insertRow(-1);
		this._actionHrEl.innerHTML = "<td colspan=3><hr></td>";
		this._actionRowEl = this._tableEl.insertRow(-1);
	}

	var html = new AjxBuffer();
	html.append("<td class='ZmApptTabViewPageField'>");
	html.append("Action");
	html.append(":</td><td colspan=2>");
	html.append("<table><tr>");
	html.append("<td>", value, "</td>");	
	html.append("<td>", AjxImg.getImageHtml(icon), "</td>");
	html.append("</<tr></table>");
	html.append("</td>");
	
	this._actionRowEl.innerHTML = html.toString();
};

ZmAssistantDialog.prototype._addCommand = 
function(html, value) {
	var id = Dwt.getNextId();
	html.append("<tr><td colspan=3><div>");
	html.append("<textarea rows=2 style='width:100%' id='",id,"'>");
	html.append(value);
	html.append("</textarea>");
	html.append("</div></td></tr>");
	return id;
};

/*
*
* @param ev		[DwtEvent]		event
*/
ZmAssistantDialog.prototype._okButtonListener =
function(ev) {
	this.popdown();
};

ZmAssistantDialog.prototype._handleResponseOkButtonListener =
function() {
	this.popdown();
};

	
ZmAssistantDialog.prototype._genericTextField =
function(title, str, args, fields) {
	var regex = new RegExp("\\s*\\b(?:"+str+")\\s+\\\"([^\\\"]*)\\\"?\\s*", "i");
	var match = args.match(regex);
	if (match) {
		var  val = match[1];
		//this._setTextField(title, val, null, null, "300px");
		fields[title] = 1;
		args = args.replace(match[0], " ");
	}
	return args;
};

ZmAssistantDialog.prototype._genericWordField =
function(title, str, args, fields) {
	var regex = new RegExp("\\s*\\b(?:"+str+")\\s+(\\S+)\\s*", "i");
	var match = args.match(regex);
	if (match) {
		var  val = match[1];
		//this._setTextField(title, val, null, null, "300px");
		fields[title] = 1;
		args = args.replace(match[0], " ");
	}
	return args;
};

ZmAssistantDialog.prototype._fieldsToDisplay =
function(fields) {
	for (var field in this._fields) {
		if (!(field in fields)) {
			this._clearField(field);
		}
	}
};
