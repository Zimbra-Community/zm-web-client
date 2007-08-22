/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.2
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.2 ("License"); you may not use this file except in
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
 * Portions created by Zimbra are Copyright (C) 2004, 2005, 2006, 2007 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s):
 * 
 * ***** END LICENSE BLOCK *****
 */

ZmCalDayView = function(parent, posStyle, controller, dropTgt, view, numDays) {
	ZmCalColView.call(this, parent, posStyle, controller, dropTgt, ZmController.CAL_DAY_VIEW, 1, false);
}

ZmCalDayView.prototype = new ZmCalColView;
ZmCalDayView.prototype.constructor = ZmCalDayView;

ZmCalDayView.prototype.toString = 
function() {
	return "ZmCalDayView";
}
