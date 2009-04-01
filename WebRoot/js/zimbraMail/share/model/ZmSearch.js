/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2004, 2005, 2006, 2007, 2008, 2009 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Yahoo! Public License
 * Version 1.0 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */

/**
 * Creates a new search with the given properties.
 * @constructor
 * @class
 * This class represents a search to be performed on the server. It has properties for
 * the different search parameters that may be used. It can be used for a regular search,
 * or to search within a conv. The results are returned via a callback.
 *
 * @param params					[hash]			hash of params:
 *        query						[string]		query string
 *        queryHint					[string]*		query string that gets appended to the query but not something the user needs to know about
 *        types						[AjxVector]		item types to search for
 *        sortBy					[constant]*		sort order
 *        offset					[int]*			starting point within result set
 *        limit						[int]*			number of results to return
 *        getHtml					[boolean]*		if true, return HTML part for inlined msg
 *        contactSource				[constant]*		where to search for contacts (GAL or personal)
 *        isGalAutocompleteSearch	[boolean]*		if true, autocomplete against GAL
 *        lastId					[int]*			ID of last item displayed (for pagination)
 *        lastSortVal				[string]*		value of sort field for above item
 *        fetch						[boolean]*		if true, fetch first hit message
 *        searchId					[int]*			ID of owning search folder (if any)
 *        conds						[array]*		list of search conditions (SearchCalendarResourcesRequest)
 *        attrs						[array]*		list of attributes to return (SearchCalendarResourcesRequest)
 *        field						[string]*		field to search within (instead of default)
 *        soapInfo					[object]*		object with method, namespace, response, and additional attribute fields for creating soap doc
 *        response					[object]*		canned JSON response (no request will be made)
 *        galType					[constant]*		type of GAL autocomplete (account or resource)
 *        folders					[array]*		list of folders for autocomplete
 *        allowableTaskStatus		[array]*		list of task status types to return (assuming one of the values for "types" is "task")
 */
ZmSearch = function(params) {

	if (params) {
		for (var p in params) {
			this[p] = params[p];
		}
		this.galType					= this.galType || ZmSearch.GAL_ACCOUNT;
		this.join						= this.join || ZmSearch.JOIN_AND;
		
		if (this.query) {
			this._parseQuery();
		}
	}
	this.isGalSearch = false;
	this.isCalResSearch = false;

	if (ZmSearch._mailEnabled == null) {
		ZmSearch._mailEnabled = appCtxt.get(ZmSetting.MAIL_ENABLED);
		if (ZmSearch._mailEnabled) {
			AjxDispatcher.require("MailCore");
		}
	}
};

// Search types
ZmSearch.TYPE = {};
ZmSearch.TYPE_ANY = "any";

ZmSearch.GAL_ACCOUNT	= "account";
ZmSearch.GAL_RESOURCE	= "resource";
ZmSearch.GAL_ALL		= "";

ZmSearch.JOIN_AND	= 1;
ZmSearch.JOIN_OR	= 2;

ZmSearch.TYPE_MAP = {};

ZmSearch.DEFAULT_LIMIT = 25;

// Sort By
ZmSearch.DATE_DESC 		= "dateDesc";
ZmSearch.DATE_ASC 		= "dateAsc";
ZmSearch.SUBJ_DESC 		= "subjDesc";
ZmSearch.SUBJ_ASC 		= "subjAsc";
ZmSearch.NAME_DESC 		= "nameDesc";
ZmSearch.NAME_ASC 		= "nameAsc";
ZmSearch.SCORE_DESC 	= "scoreDesc";
ZmSearch.DURATION_DESC	= "durDesc";
ZmSearch.DURATION_ASC	= "durAsc";
ZmSearch.STATUS_DESC	= "taskStatusDesc";
ZmSearch.STATUS_ASC		= "taskStatusAsc";
ZmSearch.PCOMPLETE_DESC	= "taskPercCompletedDesc";
ZmSearch.PCOMPLETE_ASC	= "taskPercCompletedAsc";
ZmSearch.DUE_DATE_DESC	= "taskDueDesc";
ZmSearch.DUE_DATE_ASC	= "taskDueAsc";

ZmSearch.FOLDER_QUERY_RE = new RegExp('^in:\\s*"?(' + ZmOrganizer.VALID_PATH_CHARS + '+)"?\\s*$', "i");
ZmSearch.TAG_QUERY_RE = new RegExp('^tag:\\s*"?(' + ZmOrganizer.VALID_NAME_CHARS + '+)"?\\s*$', "i");
ZmSearch.UNREAD_QUERY_RE = new RegExp('\\bis:\\s*(un)?read\\b', "i");
ZmSearch.IS_ANYWHERE_QUERY_RE = new RegExp('\\bis:\\s*anywhere\\b', "i");

ZmSearch.prototype.toString =
function() {
	return "ZmSearch";
};

ZmSearch.prototype.execute =
function(params) {
	if (params.batchCmd || this.soapInfo) {
		this._executeSoap(params);
	} else {
		this._executeJson(params);
	}
};

/**
 * Creates a SOAP request that represents this search and sends it to the server.
 *
 * @param params		[hash]				hash of params:
 *        callback		[AjxCallback]*		callback to run when response is received
 *        errorCallback	[AjxCallback]*		callback to run if there is an exception
 *        batchCmd		[ZmBatchCommand]*	batch command that contains this request
 *        timeout		[int]*				timeout value (in seconds)
 *        noBusyOverlay	[boolean]*			if true, don't use the busy overlay
 */
ZmSearch.prototype._executeSoap =
function(params) {

	this.isGalSearch = (this.contactSource && (this.contactSource == ZmId.SEARCH_GAL));
	this.isCalResSearch = (this.conds != null);
	if (!this.query && !this.isCalResSearch) return;

	var soapDoc;
	if (!this.response) {
		if (this.isGalSearch) {
			soapDoc = AjxSoapDoc.create("SearchGalRequest", "urn:zimbraAccount");
			var method = soapDoc.getMethod();
			if (this.galType) {	method.setAttribute("type", this.galType); }
			soapDoc.set("name", this.query);
		} else if (this.isAutocompleteSearch) {
			soapDoc = AjxSoapDoc.create("AutoCompleteRequest", "urn:zimbraMail");
			var method = soapDoc.getMethod();
			if (this.limit) { method.setAttribute("limit", this.limit); }
			soapDoc.set("name", this.query);
		} else if (this.isGalAutocompleteSearch) {
			soapDoc = AjxSoapDoc.create("AutoCompleteGalRequest", "urn:zimbraAccount");
			var method = soapDoc.getMethod();
			//if (this.limit) { method.setAttribute("limit", this.limit); }
			method.setAttribute("limit", this.limit || 20);
			if (this.galType) { method.setAttribute("type", this.galType); }
			soapDoc.set("name", this.query);
		} else if (this.isCalResSearch) {
			soapDoc = AjxSoapDoc.create("SearchCalendarResourcesRequest", "urn:zimbraAccount");
			var method = soapDoc.getMethod();
			if (this.attrs) { method.setAttribute("attrs", this.attrs.join(",")); }
			var searchFilterEl = soapDoc.set("searchFilter");
			if (this.conds && this.conds.length) {
				var condsEl = soapDoc.set("conds", null, searchFilterEl);
				if (this.join == ZmSearch.JOIN_OR) {
					condsEl.setAttribute("or", 1);
				}
				for (var i = 0; i < this.conds.length; i++) {
					var cond = this.conds[i];
					var condEl = soapDoc.set("cond", null, condsEl);
					condEl.setAttribute("attr", cond.attr);
					condEl.setAttribute("op", cond.op);
					condEl.setAttribute("value", cond.value);
				}
			}
		} else {
			if (this.soapInfo) {
				soapDoc = AjxSoapDoc.create(this.soapInfo.method, this.soapInfo.namespace);
				// Pass along any extra soap data. (Voice searches use this to pass user identification.)
				for (var nodeName in this.soapInfo.additional) {
					var node = soapDoc.set(nodeName);
					var attrs = this.soapInfo.additional[nodeName];
					for (var attr in attrs) {
						node.setAttribute(attr, attrs[attr]);
					}
				}
			} else {
				soapDoc = AjxSoapDoc.create("SearchRequest", "urn:zimbraMail");
			}
			var method = this._getStandardMethod(soapDoc);
			if (this.types) {
				var a = this.types.getArray();
				if (a.length) {
					var typeStr = [];
					for (var i = 0; i < a.length; i++) {
						typeStr.push(ZmSearch.TYPE[a[i]]);
					}
					method.setAttribute("types", typeStr.join(","));
					// special handling for showing participants ("To" instead of "From")
					var folder = appCtxt.getById(this.folderId);
					if (folder &&
						(folder.isUnder(ZmFolder.ID_SENT) ||
						folder.isUnder(ZmFolder.ID_DRAFTS) ||
						folder.isUnder(ZmFolder.ID_OUTBOX)))
					{
						method.setAttribute("recip", "1");
					}
					// if we're prefetching the first hit message, also mark it as read
					if (this.fetch) {

						method.setAttribute("fetch", ( this.fetch == "all" ) ? "all" : "1");
						// and set the html flag if we want the html version
						if (this.getHtml) {
							method.setAttribute("html", "1");
						}
					}
					if (this.markRead) {
						method.setAttribute("read", "1");
					}
				}
			}
		}
	}
		
	var respCallback = new AjxCallback(this, this._handleResponseExecute, [params.callback]);
	
	if (params.batchCmd) {
		params.batchCmd.addRequestParams(soapDoc, respCallback);
	} else {
		return appCtxt.getAppController().sendRequest({soapDoc:soapDoc, asyncMode:true, callback:respCallback,
													   errorCallback:params.errorCallback,
													   timeout:params.timeout, noBusyOverlay:params.noBusyOverlay,
													   response:this.response});
	}
};

/**
 * Creates a JSON request that represents this search and sends it to the server.
 *
 * @param params		[hash]				hash of params:
 *        callback		[AjxCallback]*		callback to run when response is received
 *        errorCallback	[AjxCallback]*		callback to run if there is an exception
 *        batchCmd		[ZmBatchCommand]*	batch command that contains this request
 *        timeout		[int]*				timeout value (in seconds)
 *        noBusyOverlay	[boolean]*			if true, don't use the busy overlay
 */
ZmSearch.prototype._executeJson =
function(params) {

	this.isGalSearch = (this.contactSource && (this.contactSource == ZmId.SEARCH_GAL));
	this.isCalResSearch = (this.conds != null);
	if (!this.query && !this.isCalResSearch) { return; }

	var jsonObj, request, soapDoc;
	if (!this.response) {
		if (this.isGalSearch) {
			jsonObj = {SearchGalRequest:{_jsns:"urn:zimbraAccount"}};
			request = jsonObj.SearchGalRequest;
			if (this.galType) { request.type = this.galType; }
			request.name = this.query;

			// bug #36188 - add offset/limit for paging support
			request.offset = this.offset = this.offset || 0;
			request.limit = this.limit = appCtxt.get(ZmSetting.CONTACTS_PER_PAGE);
			if (this.sortBy) {
				request.sortBy = this.sortBy;
			}
		} else if (this.isAutocompleteSearch) {
			jsonObj = {AutoCompleteRequest:{_jsns:"urn:zimbraMail"}};
			request = jsonObj.AutoCompleteRequest;
			if (this.limit) { request.limit = this.limit; }
			request.name = {_content:this.query};
		} else if (this.isGalAutocompleteSearch) {
			jsonObj = {AutoCompleteGalRequest:{_jsns:"urn:zimbraAccount"}};
			request = jsonObj.AutoCompleteGalRequest;
			request.limit = this.limit || 20;
			request.name = this.query;
			if (this.galType) { request.type = this.galType; }
		} else if (this.isCalResSearch) {
			jsonObj = {SearchCalendarResourcesRequest:{_jsns:"urn:zimbraAccount"}};
			request = jsonObj.SearchCalendarResourcesRequest;
			if (this.attrs) {
				request.attrs = this.attrs.join(",");
			}
			if (this.conds && this.conds.length) {
				request.searchFilter = {conds:{}};
				var conds = request.searchFilter.conds;
				var cond = conds.cond = [];
				if (this.join == ZmSearch.JOIN_OR) {
					conds.or = 1;
				}
				for (var i = 0; i < this.conds.length; i++) {
					var c = this.conds[i];
					cond.push({attr:c.attr, op:c.op, value:c.value});
				}
			}
		} else {
			if (this.soapInfo) {
				soapDoc = AjxSoapDoc.create(this.soapInfo.method, this.soapInfo.namespace);
				// Pass along any extra soap data. (Voice searches use this to pass user identification.)
				for (var nodeName in this.soapInfo.additional) {
					var node = soapDoc.set(nodeName);
					var attrs = this.soapInfo.additional[nodeName];
					for (var attr in attrs) {
						node.setAttribute(attr, attrs[attr]);
					}
				}
			} else {
				jsonObj = {SearchRequest:{_jsns:"urn:zimbraMail"}};
				request = jsonObj.SearchRequest;
			}
			this._getStandardMethodJson(request);
			if (this.types) {
				var a = this.types.getArray();
				if (a.length) {
					var typeStr = [];
					for (var i = 0; i < a.length; i++) {
						typeStr.push(ZmSearch.TYPE[a[i]]);
					}
					request.types = typeStr.join(",");

					// special handling for showing participants ("To" instead of "From")
					var folder = appCtxt.getById(this.folderId);
					if (folder &&
						(folder.isUnder(ZmFolder.ID_SENT) ||
						folder.isUnder(ZmFolder.ID_DRAFTS) ||
						folder.isUnder(ZmFolder.ID_OUTBOX)))
					{
						request.recip = 1;
					}

					// if we're prefetching the first hit message, also mark it as read
					if (this.fetch) {
                        request.fetch = ( this.fetch == "all" ) ? "all" : 1;
						// and set the html flag if we want the html version
						if (this.getHtml) {
							request.html = 1;
						}
					}

					if (this.markRead) {
						request.read = 1;
					}

                    if (this.headers) {
                        for (var hdr in this.headers) {
                            if (!request.header) { request.header = []; }
                            request.header.push({n:hdr});
                        }
                    }

					if (a.length == 1 && a[0] == ZmItem.TASK && this.allowableTaskStatus) {
						request.allowableTaskStatus = this.allowableTaskStatus;
					}
                }
            }
        }
    }
		
	var respCallback = new AjxCallback(this, this._handleResponseExecute, [params.callback]);
	
	if (params.batchCmd) {
		params.batchCmd.addRequestParams(soapDoc, respCallback);
	} else {
		return appCtxt.getAppController().sendRequest({jsonObj:jsonObj, soapDoc:soapDoc, asyncMode:true, callback:respCallback,
													   errorCallback:params.errorCallback,
													   timeout:params.timeout, noBusyOverlay:params.noBusyOverlay,
													   response:this.response});
	}
};

/**
 * Converts the response into a ZmSearchResult and passes it along.
 */
ZmSearch.prototype._handleResponseExecute = 
function(callback, result) {
	var response = result.getResponse();
	if (this.isGalSearch) {
		response = response.SearchGalResponse;
	} else if (this.isCalResSearch) {
		response = response.SearchCalendarResourcesResponse;
	} else if (this.isAutocompleteSearch) {
		response = response.AutoCompleteResponse;
	} else if (this.isGalAutocompleteSearch) {
		response = response.AutoCompleteGalResponse;
	} else if (this.soapInfo) {
		response = response[this.soapInfo.response];
	} else {
		response = response.SearchResponse;
	}
	var searchResult = new ZmSearchResult(this);
	searchResult.set(response);
	result.set(searchResult);
	
	if (callback) {
		callback.run(result);
	}
};

/**
 * Fetches a conv from the server.
 * 
 * @param params		[hash]				hash of params:
 *        cid			[string]*			conv ID
 *        callback		[AjxCallback]*		callback to run with result
 *        fetchId		[string]*			ID of msg to load
 *        markRead		[boolean]*			if true, mark msg read
 *        noTruncate	[boolean]*			if true, do not limit size of msg
 */
ZmSearch.prototype.getConv = 
function(params) {
	if (!this.query || !params.cid) { return; }

	var jsonObj = {SearchConvRequest:{_jsns:"urn:zimbraMail"}};
	var request = jsonObj.SearchConvRequest;
	this._getStandardMethodJson(request);
	request.cid = params.cid;
	if (params.fetchId) {
		request.fetch = params.fetchId;	// fetch content of this msg
		if (params.markRead) {
			request.read = 1;			// mark that msg read
		}
		if (this.getHtml) {
			request.html = 1;			// get it as HTML
		}
		// added headers to the request
		if (ZmMailMsg.requestHeaders) {
			for (var hdr in ZmMailMsg.requestHeaders) {
				if (!request.header) request.header = [];
				request.header.push({n:hdr});
			}
		}
	}

	if (!params.noTruncate) {
		request.max = appCtxt.get(ZmSetting.MAX_MESSAGE_SIZE);
	}

	var respCallback = new AjxCallback(this, this._handleResponseGetConv, params.callback);
	appCtxt.getAppController().sendRequest({jsonObj:jsonObj, asyncMode:true, callback:respCallback});
};

ZmSearch.prototype._handleResponseGetConv = 
function(callback, result) {
	var response = result.getResponse().SearchConvResponse;
	var searchResult = new ZmSearchResult(this);
	searchResult.set(response, null, true);
	result.set(searchResult);
	
	if (callback) {
		callback.run(result);
	}
};

/**
* Returns a title that summarizes this search.
*/
ZmSearch.prototype.getTitle =
function() {
	var where;
	if (this.folderId) {
		var fid = ZmOrganizer.getSystemId(this.folderId);
		var folder = appCtxt.getById(fid);
		if (folder) {
			where = folder.getName(true, ZmOrganizer.MAX_DISPLAY_NAME_LENGTH, true);
		}
	} else if (this.tagId) {
		where = appCtxt.getById(this.tagId).getName(true, ZmOrganizer.MAX_DISPLAY_NAME_LENGTH, true);
	}
	return where
		? ([ZmMsg.zimbraTitle, where].join(": "))
		: ([ZmMsg.zimbraTitle, ZmMsg.searchResults].join(": "));
};

ZmSearch.prototype._getStandardMethod = 
function(soapDoc) {

	var method = soapDoc.getMethod();

	if (this.sortBy) {
		method.setAttribute("sortBy", this.sortBy);
	}

	if (ZmSearch._mailEnabled) {
		var headerNode;
		for (var hdr in ZmMailMsg.requestHeaders) {
			headerNode = soapDoc.set('header', null, null);
			headerNode.setAttribute('n', hdr);
		}
	}

	// bug 5771: add timezone and locale info
	ZmTimezone.set(soapDoc, AjxTimezone.DEFAULT, null);
	soapDoc.set("locale", appCtxt.get(ZmSetting.LOCALE_NAME), null);

	if (this.lastId != null && this.lastSortVal) {
		// cursor is used for paginated searches
		var cursor = soapDoc.set("cursor");
		cursor.setAttribute("id", this.lastId);
		cursor.setAttribute("sortVal", this.lastSortVal);
		if (this.endSortVal)
			cursor.setAttribute("endSortVal", this.endSortVal);
	}

	this.offset = this.offset || 0;
	method.setAttribute("offset", this.offset);

	// always set limit (init to user pref for page size if not provided)
	if (!this.limit) {
		if (this.contactSource && this.types.size() == 1) {
			this.limit = appCtxt.get(ZmSetting.CONTACTS_PER_PAGE);
		} else if (appCtxt.get(ZmSetting.MAIL_ENABLED)) {
			this.limit = appCtxt.get(ZmSetting.PAGE_SIZE);
		} else if (appCtxt.get(ZmSetting.CONTACTS_ENABLED)) {
			this.limit = appCtxt.get(ZmSetting.CONTACTS_PER_PAGE);
		} else {
			this.limit = ZmSearch.DEFAULT_LIMIT;
		}
	}
	method.setAttribute("limit", this.limit);

	// and of course, always set the query and append the query hint if applicable
	// only use query hint if this is not a "simple" search
	var query = (!this.folderId && this.queryHint)
		? ([this.query, " (", this.queryHint, ")"].join(""))
		: this.query;
	soapDoc.set("query", query);

	// set search field if provided
	if (this.field) {
		method.setAttribute("field", this.field);
	}

	return method;
};

ZmSearch.prototype._getStandardMethodJson = 
function(req) {

	if (this.sortBy) {
		req.sortBy = this.sortBy;
	}

	if (ZmSearch._mailEnabled) {
		var hdrs = ZmMailMsg.requestHeaders;
		if (hdrs && hdrs.length) {
			req.header = [];
			for (var hdr in hdrs) {
				req.header.push({n:hdr});
			}
		}
	}

	// bug 5771: add timezone and locale info
	ZmTimezone.set(req, AjxTimezone.DEFAULT);
	// bug 15878: We can't use appCtxt.get(ZmSetting.LOCALE) because that
	//            will return the server's default locale if it is not set
	//            set for the user or their COS. But AjxEnv.DEFAULT_LOCALE
	//            is set to the browser's locale setting in the case when
	//            the user's (or their COS) locale is not set.
	req.locale = { _content: AjxEnv.DEFAULT_LOCALE };

	if (this.lastId != null && this.lastSortVal) {
		// cursor is used for paginated searches
		req.cursor = {id:this.lastId, sortVal:this.lastSortVal};
		if (this.endSortVal) {
			req.cursor.endSortVal = this.endSortVal;
		}
	}

	req.offset = this.offset = this.offset || 0;

	// always set limit (init to user pref for page size if not provided)
	if (!this.limit) {
		if (this.contactSource && this.types.size() == 1) {
			this.limit = appCtxt.get(ZmSetting.CONTACTS_PER_PAGE);
		} else if (appCtxt.get(ZmSetting.MAIL_ENABLED)) {
			this.limit = appCtxt.get(ZmSetting.PAGE_SIZE);
		} else if (appCtxt.get(ZmSetting.CONTACTS_ENABLED)) {
			this.limit = appCtxt.get(ZmSetting.CONTACTS_PER_PAGE);
		} else {
			this.limit = ZmSearch.DEFAULT_LIMIT;
		}
	}
	req.limit = this.limit;

	// and of course, always set the query and append the query hint if
	// applicable only use query hint if this is not a "simple" search
	req.query = (!this.folderId && this.queryHint)
		? ([this.query, " (", this.queryHint, ")"].join(""))
		: this.query;

	// set search field if provided
	if (this.field) {
		req.field = this.field;
	}
};

/**
* Parse simple queries so we can do basic matching on new items (determine whether
* they match this search query). The following types of queries are handled:
*
*    in:foo
*    tag:foo
*
* which may result in this.folderId or this.tagId getting set.
*/
ZmSearch.prototype._parseQuery =
function() {
	var results = this.query.match(ZmSearch.FOLDER_QUERY_RE);
	if (results) {
		var path = results[1].toLowerCase();
		// first check if it's a system folder (name in query string may not match actual name)
		for (var id in ZmFolder.QUERY_NAME) {
			if (ZmFolder.QUERY_NAME[id] == path) {
				this.folderId = id;
			}
		}
		// now check all folders by name
		if (!this.folderId) {
			var folders = appCtxt.getFolderTree();
			var folder = folders ? folders.getByPath(path, true) : null;
			if (folder) {
				this.folderId = folder.id;
			}
		}
	}
	results = this.query.match(ZmSearch.TAG_QUERY_RE);
	if (results) {
		var name = results[1].toLowerCase();
		var tagTree = appCtxt.getTagTree();
		if (tagTree) {
			var tag = tagTree.getByName(name);
			if (tag) {
				this.tagId = tag.id;
			}
		}
	}
	this.hasUnreadTerm = ZmSearch.UNREAD_QUERY_RE.test(this.query);
	this.isAnywhere = ZmSearch.IS_ANYWHERE_QUERY_RE.test(this.query);
};

ZmSearch.prototype.hasFolderTerm =
function(path) {
	if (!path) return false;
	var regEx = new RegExp('\\s*in:\\s*"?(' + AjxStringUtil.regExEscape(path) + ')"?\\s*', "i");
	var regExNot = new RegExp('(-|not)\\s*in:\\s*"?(' + AjxStringUtil.regExEscape(path) + ')"?\\s*', "i");
	return (regEx.test(this.query) && !regExNot.test(this.query));
};

ZmSearch.prototype.replaceFolderTerm =
function(oldPath, newPath) {
	if (!(oldPath && newPath)) return;
	var regEx = new RegExp('(\\s*in:\\s*"?)(' + AjxStringUtil.regExEscape(oldPath) + ')("?\\s*)', "gi");
	this.query = this.query.replace(regEx, "$1" + newPath + "$3");
};

ZmSearch.prototype.hasTagTerm =
function(name) {
	if (!name) return false;
	var regEx = new RegExp('\\s*tag:\\s*"?(' + AjxStringUtil.regExEscape(name) + ')"?\\s*', "i");
	var regExNot = new RegExp('(-|not)\\s*tag:\\s*"?(' + AjxStringUtil.regExEscape(name) + ')"?\\s*', "i");
	return (regEx.test(this.query) && !regExNot.test(this.query));
};

ZmSearch.prototype.replaceTagTerm =
function(oldName, newName) {
	if (!(oldName && newName)) return;
	var regEx = new RegExp('(\\s*tag:\\s*"?)(' + AjxStringUtil.regExEscape(oldName) + ')("?\\s*)', "gi");
	this.query = this.query.replace(regEx, "$1" + newName + "$3");
};
