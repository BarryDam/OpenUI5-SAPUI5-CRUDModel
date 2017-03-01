/**
 * nl.barrydam.model.CRUDModel
 * @author	Barry Dam
 * @version 1.2.2
 * add this file to your project folder library/bd/model/
 * In your Component.js add:
 * jQuery.sap.registerModulePath("nl.barrydam", "library/bd/");
 * jQuery.sap.require("nl.barrydam.model.CRUDModel");
 */
(function($, windows, undefined){
	jQuery.sap.declare('nl.barrydam.model.CRUDModel');
	sap.ui.define(
		'nl/barrydam/model/CRUDModel',
		['sap/ui/model/json/JSONModel'],
		function(JSONModel) {
			"use strict";

			
			var _variables = { // internal variables
					mDefaultParameters : { 
						// the API auto generates setters and getters for all parameters
						// for example user will have a setUsername(value) and getUsername() method available
						// these params can be passed along with the constructor 
						bindingMode			: "TwoWay", // only TwoWay or OneWay
						password			: '',		// password when a auto-login is needed 
						primaryKey			: "id",		// Default db primaryKey
						serviceUrl			: '',		// URL To api
						serviceUrlParams	: {},		// additional URL params
						useBatch			: false,	//when true all POST PUT and DELETE requests will be sent in batch requests (default = false),
						user				: ''		// username when a auto-login is needed
					},
					// these events will be auto created
					mSupportedEvents : [
						"Login",			// attachLogin attachLoginOnce fireLogin
						"Logout",			// attachLogout attachLogoutOnce fireLogout
						"MetadataFailed",	// attachMetadataFailed attachMetadataFailedOnce fireMetaDatafailed
						"MetadataLoaded",	// attachMetadataLoaded attachMetadataLoadedOnce fireMetadataLoaded
						"Reload"			// attachReload attachReloadOnce fireReload
					],
					mUnsupportedOperations : ["loadData"],	// methods from JSONModel which cannot be used
					csrf: null // csrf token
				},
				_methods = {}; // internal methods which can be used inside the CRUDModel methods
			
			
			/**
			 * magic _set methods *used in constructor and createSettersAndGetters,
			 * @param {object} Proxy   refers to the CRUDModel object
			 * @param {string} key   key
			 * @param {string} value value
			 */
			_methods._set = function(oProxy, key, value) {
				switch (key) {
					// determine the service base url and its parameters
					case 'serviceUrl' :
						var aUrl = value.split('?');
						if (aUrl.length > 1) {
							// re-assign the value and add a trailing slash if not present
							value = aUrl[0] + ( (aUrl[0].slice(-1) !== "/") ? "/" : "" );
							if (aUrl[1]) {
								var mServiceUrlParams = oProxy.getServiceUrlParams();
								var aUrlParameters = aUrl[1].split('&');
								for (var keyUrlParameter in aUrlParameters) {
									var aUrlParameter = aUrlParameters[keyUrlParameter].split('=');
									mServiceUrlParams[aUrlParameter[0]] = aUrlParameter[1] || false;
								}
								oProxy.setServiceUrlParams(mServiceUrlParams);
							}
						}
						break;
					case 'bindingMode':
						value = (["TwoWay", "OneWay"].indexOf(value) !== -1) ? value : "TwoWay";
						oProxy.setDefaultBindingMode(value);
						break;
				}
				// store in settings
				oProxy._mSettings[key] = value;
			};

			/**
			 * magic _get methods *used in constructor and createSettersAndGetters,
			 * @param {object} Proxy   refers to the CRUDModel object
			 * @param {string} key   key
			 * @param {string} value value
			 */
			_methods._get = function(oProxy, key) {
				var value;
				switch (key) {
					case "primaryKey" :
						// if primary key is set by metadata
						if (arguments.length >= 3 && arguments[2] in oProxy._oCRUDdata.oPrimaryKeys) {
							value = oProxy._oCRUDdata.oPrimaryKeys[arguments[2]];
						}
					break;

					default:
						value = oProxy._mSettings[key];
						break;
				} 
				return value;
			};


			/**
			 * Creates getters and setters for the allowed to change params of the _mSettings object
			 * This method is only called once by the CRUDModel constructor
			 * @example primaryKey will generate getPrimaryKey and setPrimaryKey
			 *  
			 * @param  object  oProxy the created nl.barydam.CRUDModel object
			 */
			_methods.createSettersAndGetters = function(oProxy) {
				$.each(_variables.mDefaultParameters, function(key) { // $.each used in stead of for! else key would be allways the last iteration
					var f		= key.charAt(0).toUpperCase(),
						sSetter	= 'set'+f+key.substr(1),
						sGetter = 'get'+f+key.substr(1);
					oProxy[sSetter] = function(value) {
						_methods._set(oProxy, key, value);						
					};
					oProxy[sGetter] = function() {
						var aNew = [oProxy, key];
						if (arguments.length) {
							$.each(arguments, function(i, arg) {
								aNew.push(arg);
							});
						}
						return _methods._get.apply(this, aNew);						
					};
				});
			};

			
			/**
			 * Creates a new debug-level entry in the log with the given message, details and calling component.
			 * @param  {string} sMessage Message text to display
			 * @param  {string} Method   Method which calls the log
			 * @return {object} jQuery.sap.log.Logger	The log instance
			 */
			_methods.debugLog = function(sMessage, Method) {
				return jQuery.sap.log.debug(
					sMessage, 
					"",
					"com.barydam.sap.ui.model.json.CRUDModel"+((Method) ? "."+Method : "")
				);
			};

			/**
			 * Helper method for bindList bindProperty and bindTree methods
			 * @param  {object} oProxy      oProxy the created nl.barydam.CRUDModel object
			 * @param  {string} sPath    
			 * @param  {array} aSorters 
			 * @param  {array} aFilters 
			 * @return {xhr object}          
			 */
			var __reloadExecBind = []; // hold the binds and will be reloaded when this.reload is called
			_methods.reloadBinds = function(fnSuccess, fnError) {
				fnSuccess	= (typeof fnSuccess == "function") ? fnSuccess : function(){};
				fnError		= (typeof fnError == "function") ? fnError : function(){};
				if (__reloadExecBind.length === 0) {
					fnSuccess();
				} else {
					var aPromises = [];
					$.each(__reloadExecBind, function(i, o) {
						aPromises.push(_methods.execBind(o.oProxy, o.sPath, o.aSorters, o.aFilters, true));
					});
					$.when.apply($, aPromises)
						.done(function() { 
							var aErrors = [];
							$.each(arguments, function(i, a) {
								if (a[1] == 'error') {
									aErrors.push(a);
								}
							});
							if (aErrors.length) {
								fnError(aErrors);
							} else {
								fnSuccess();
							}
						})
						.fail(function() {
							fnError.apply(this, arguments);
						});
				}
			};
			_methods.execBind = function(oProxy, sPath, aSorters, aFilters, bAttachReload) {
				var mPath	= _methods.parsePath(sPath),
					sUrl	= mPath.Table;
				if (! sUrl) { return; }
				// Filter
				if ( $.isArray(aFilters) && aFilters.length ) {
					sUrl += "?"+_methods.parseUI5Filters(aFilters);
				}
				if (! bAttachReload) { // refresh after login
					oProxy.attachLogin(function() { 
						_methods.execBind(oProxy, sPath, aSorters, aFilters, true);
					});
					__reloadExecBind.push({
						oProxy		: oProxy,
						sPath		: sPath,
						aSorters	: aSorters,
						aFilters	: aFilters
					});
					// oProxy.attachReload(function() { 
					// 	console.log(arguments);
					// 	_methods.execBind(oProxy, sPath, aSorters, aFilters, true);
					// });
				}				
				return oProxy._serviceCall(
					sUrl,
					{
						type: "GET",
						success: function(mResponse) {
							// set property of parent method
							JSONModel.prototype.setProperty.call(
								oProxy, 
								"/"+mPath.Table,  
								$.extend(
									true, 
									_methods.parseCRUDresultList(oProxy, mPath.Table, mResponse),
									oProxy.getProperty("/"+mPath.Table)
								)
							);
						}
					}
				);	
			};


			/**
			 * Creates a new model and check the columns with the metadata (if present)
			 * @param  {object} oProxy			Refers to CRUDModel object
			 * @param  {string} sTableName	Table name
			 * @param  {object} mData		Unprocessed entry
			 * @return {object} mData		Processed entry
			 */
			_methods.generateCreateByMetadata = function(oProxy, sTableName, mData) {
				mData = mData || {};
				if (sTableName in oProxy._oCRUDdata.oColumns) {
					var oNew = {};
					$.each(oProxy._oCRUDdata.oColumns[sTableName], function(i, oColumn) {
						oNew[oColumn.name] = mData[oColumn.name] || "";
						oNew[oColumn.name] = _methods.parseCRUDGetColumn(oProxy, sTableName, oColumn.name, oNew[oColumn.name]);
					});
					if (Object.keys(oNew).length) {
						mData = oNew;
					}
				}
				return mData;
			};
			
			/**
			 * Parse data received from api
			 */
			_methods.parseCRUDGetData = function(oProxy, sTableName, mData) {
				if (typeof mData !== "object" || Object.keys(mData).length) {
					return mData;
				}
				mData = $.extend(true, {}, mData);
				for (var sColumn in mData) {
					mData[sColumn] = _methods.parseCRUDGetColumn(oProxy, sTableName, sColumn, mData[sColumn]);
				}
				return mData;
			};

			_methods.parseCRUDGetColumn = function(oProxy, sTableName, sColumn, sValue) {
				if (sValue && sTableName in oProxy._oCRUDdata.oColumns && sColumn in oProxy._oCRUDdata.oColumns[sTableName]) {
					switch (oProxy._oCRUDdata.oColumns[sTableName][sColumn].type) {
						case "date":
						case "datetime":
						case "timestamp":
							sValue = new Date(sValue);
							break;
						default: // nothing
							break;
					}
				}
				return sValue;
			};

			/**
			 * Parse the data before sending it back to the api
			 */
			_methods.parseCRUDPostData = function(oProxy, sTableName, mData) {
				if (typeof mData !== "object" || Object.keys(mData).length === 0) {
					return mData;
				}
				mData = $.extend(true, {}, mData);
				for (var sColumn in mData) {
					if (mData[sColumn] && sTableName in oProxy._oCRUDdata.oColumns && sColumn in oProxy._oCRUDdata.oColumns[sTableName]) {
						mData[sColumn] = _methods.parseCRUDPostColumn(oProxy, sTableName, sColumn, mData[sColumn]);
					}					
				}
				return mData;
			};
			_methods.parseCRUDPostColumn = function(oProxy, sTableName, sColumn, sValue) {
				if (sValue && sTableName in oProxy._oCRUDdata.oColumns && sColumn in oProxy._oCRUDdata.oColumns[sTableName]) {
					switch (oProxy._oCRUDdata.oColumns[sTableName][sColumn].type) {
						case "date":
							if (sValue instanceof Date) {
								sValue = isNaN(sValue.getTime()) ? "" : sValue.toISOString().substring(0, 10);
							}
							break;
						case "datetime":
						case "timestamp":
							if (sValue instanceof Date) {
								sValue = isNaN(sValue.getTime()) ? "" : sValue.toISOString().substring(0, 19).replace('T', ' ');
							}							
							break;
						default: // nothing
							break;
					}
				}
				return sValue;
			};


			/**
			 * Parses CRUD results List - List results and converts them to json data
			 * @param  {object} oProxy        refers to CRUDModel object
			 * @param  {string} sTableName Table name
			 * @param  {object} mResponse  Responsedata from CRUD
			 * @return {object} processed json object
			 */
			_methods.parseCRUDresultList = function(oProxy, sTableName, mResponse) {
				if (typeof mResponse == "object" && sTableName in mResponse && 'records' in mResponse[sTableName] && 'columns' in mResponse[sTableName]) {
					var mRows	= mResponse[sTableName].records,
						mColums = mResponse[sTableName].columns;
					// try to save columns
					if (! (sTableName in oProxy._oCRUDdata.oColumns)) {
						oProxy._oCRUDdata.oColumns[sTableName] = {};
						$.each(mColums, function(index, sColumn){
							if (sColumn !== oProxy.getPrimaryKey(sTableName)) {
								oProxy._oCRUDdata.oColumns[sTableName][sColumn] = {
									name:sColumn,
									type: "string"
								};
							}
						});							
					}
					// process rows
					var mData = {};
					for (var i in mRows) {
						var mNewData = {},
							mRow     = mRows[i];
						for (var iR in mRow) {
							mNewData[mColums[iR]] = _methods.parseCRUDGetColumn(oProxy, sTableName, mColums[iR], mRow[iR]);	
						}
						mData[mNewData[oProxy.getPrimaryKey(sTableName)]] = mNewData;
					}
					return mData;
				} else {
					return {};
				}
			};


			/**
			 * process the metadata
			 * @param  {object} oProxy        refers to CRUDModel object
			 * @param  {[type]} mListResult [description]
			 * @return {void}
			 */
			_methods.processMetadata = function(oProxy, mListResult) {
				if (! ("paths" in mListResult)) {
					return;
				}
				var oReturn		= {};
				$.each(mListResult.paths, function(sPath, o){
					var mPath	= _methods.parsePath(sPath),
						sTable	= mPath.Table;
					if (mPath.Id) { return; /*{id}*/ }
					oReturn[sTable] = {};
					if (("post" in o) && ("parameters" in o.post) && typeof o.post.parameters[0] == "object") { 
						var aColumns = o.post.parameters[0].schema.properties,
							bPrimaryFound = false;
						for (var sCol in aColumns) {
							if ("x-primary-key" in aColumns[sCol]) {
								oProxy._oCRUDdata.oPrimaryKeys[sTable] = sCol;
								bPrimaryFound = true;
							} else {
								oReturn[sTable][sCol] = {"name": sCol, "type": ""};
								oReturn[sTable][sCol].type = aColumns[sCol]["x-dbtype"] || "string";
							} 
						}
						if (! bPrimaryFound) { // cant create by this oProxy since there is no primary Id
							delete oReturn[sTable];
							_methods.debugLog("The primary is unkown for table:"+ sTable, "parseMetadata");
							return;
						}
					}
					if (("get" in o) && 
						("responses" in o.get) && 
						("200" in o.get.responses) && 
						("schema" in o.get.responses["200"]) && 
						("items" in o.get.responses["200"].schema) && 
						("properties" in o.get.responses["200"].schema.items) && 
						typeof o.get.responses["200"].schema.items.properties == "object" && 
						Object.keys(o.get.responses["200"].schema.items.properties).length
					) {
						var oItems = o.get.responses["200"].schema.items.properties;
						for (var sColName in oItems) {
							if (! (sColName in oReturn[sTable])) {
								oReturn[sTable][sColName] = {"name": sColName, "type": ""};
							}
							oReturn[sTable][sColName].type = oItems[sColName]["x-dbtype"] || "string";
						}
					}
				});
				oProxy._oCRUDdata.oColumns = Object.keys(oReturn).length ? oReturn : null ;
			};


			/**
			 * Example /student/1
			 * returns
			 * {
			 *	Table: "student",
			 *	Id: "1",
			 *	Path: "/student/1"
			 * }
			 * @param  {string}		path
			 * @return {object}     { Table: 'tablename', Id: "id", Path: "/tablename/id" }
			 */
			_methods.parsePath = function(sPath) {
				// turn /example('1') to /example/1
				sPath = sPath.replace("('", "/").replace("'')", "");
				var aPath = sPath.split("/"),
					oReturn = {
						Table	: "",
						Id		: "",
						Path	: ""	
					};
				if (aPath.length === 0) {
					return oReturn;
				}
				if (aPath[0] === "") {
					aPath.shift();	
				}
				if (aPath.length === 0) {
					return oReturn;
				}
				oReturn.Table	= aPath[0];
				oReturn.Path	= "/"+oReturn.Table;
				if (aPath.length > 1) {
					oReturn.Id		= aPath[1];
					oReturn.Path	+= "/"+oReturn.Id;
				}
				return oReturn;
			};


			/**
			 * Converts sap.ui.model.Filter to API filter string
			 * @param	{array}		afilters	array containing sap.ui.model.Filter objects
			 * @returns {string}	filter		string example filter=naam,eq,Barry
			 */
			_methods.parseUI5Filters = function(aFilters) {
				if (! (aFilters instanceof Array) || aFilters.length === 0) {
					return "";
				}
				function parse(oFilter) {
					var oOperators = {
						BT         : "bt",
						Contains   : "cs",
						EndsWith   : "ew",
						EQ         : "eq",
						GE         : "ge",
						GT         : "gt",
						LE         : "le",
						LT         : "lt",
						NE         : "neq", // NOT SUPPORTED BY PHP API
						StartsWith : "sw",
					};
					return oFilter.sPath+','+oOperators[oFilter.sOperator]+','+oFilter.oValue1+((oFilter.sOperator=='BT')?','+oFilter.oValue2:'');
				}
				var aString = [],
					sSatisfy = "any";
				$.each(aFilters, function(i, oFilter) {
					if (oFilter instanceof sap.ui.model.Filter) {
						if (oFilter._bMultiFilter) {
							for (var iSub in oFilter.aFilters) {
								aString.push(parse(oFilter.aFilters[iSub]));
							}
							sSatisfy = (typeof oFilter.bAnd != "undefined") ? ((oFilter.bAnd)?"all":"any") : "all" ;
						} else {
							aString.push(parse(oFilter));
						}
					}
				});
				var sFilter = (aString.length>1) ? "filter[]=" : "filter=";
				return sFilter+aString.join("&"+sFilter)+((aString.length>1)?"&satisfy="+sSatisfy:"");
			};
			

			/**
			 * 
			 */
			var CRUDModel = JSONModel.extend(
				'nl.barrydam.model.CRUDModel',
				{
					_oCRUDdata : {
						oPrimaryKeys: {
							/**
							 *
							 */
						},
						oColumns: {
							/* example
							student: ["id", "name", "birtday", "gender"],
							school: ["id", "name", "address", ....etc]
							 */
						},
						oColumnTypes: {
							/* example
							student: {
								id       : "int",
								name     : "string",
								birthday : "date",
								gender   : "string"
							}							
							 */
						},
						oBatch: {
							/*
							PUT: {
								student: {
									1: {
										id : 1,
										name: "Barry"
									}
								}
							}
							POST: : {
								student: {
									_CREATED_ID_: {
										data....
									}
								}
							}
							DELETE: {
								student: [1, 3, 4 ..] array of id's to delete
							}
							 */
						}
					},
					/**
					 * settings object is set in the constructor and is a merge of 
					 * - _variables.mDefaultParameters (defined within this scope)
					 * - mParameters (passed in constructor)
					 * - and _mSettings
					 * all values can be set and get by magic methods
					 * @type {Object}
					 */
					_mSettings : {},

					/**
					 * Metadata settings
					 * @type {Object}
					 */
					// metadata : {
					// 	publicMethods : ["submitChanges", "resetChanges", "reload", "remove", "update"]
					// },

					/**
					 * Constructor fired on object creation
					 * @param  string sServiceUrl The URL to the JSON service
					 * @param  object mParameters overwrite settings for the _variables.mDefaultParameters value
					 */
					constructor: function(sServiceUrl, mParameters) {
						JSONModel.apply(this); // do not pass arguments
						// create setters and getters on object creation
						_methods.createSettersAndGetters(this);
						// reset settings (needed for getOne method)
						this._mSettings = {

						};
						// set service url
						this.setServiceUrl(sServiceUrl);
						if (typeof mParameters !== 'object')
							mParameters = {};
						// Set the settings and check if passed param is allowed to set
						// any passed parameter which is not in the _variables.mDefaultParameters
						// will not be stored			
						var	aDefaultParametersKeys	= Object.keys(_variables.mDefaultParameters);
						for (var kParameter in mParameters) {
							if (aDefaultParametersKeys.indexOf(kParameter) !== -1 && typeof mParameters[kParameter] === typeof _variables.mDefaultParameters[kParameter]) {
								_methods._set(this, kParameter, mParameters[kParameter]);
							}
						}
						// merge the mDefaultSettings with the _mSettings to make sure whe have every needed param
						this._mSettings	= $.extend(true, {}, _variables.mDefaultParameters, this._mSettings);
						// metadata
						var that			= this, 
							fnLoadMetadata	= function() {
								that._serviceCall("", {
									success: function(m) {
										_methods.processMetadata(that, m);
										that.fireMetadataLoaded();
									},
									error: function(xhr, textStatus, httpStatus) {
										that.fireMetadataFailed();	
										// not logged in? load metadata after login
										if (httpStatus == "Unauthorized") {
											that.attachLoginOnce(function(){
												fnLoadMetadata();
											});
										}
									},
									async: false // keep this false
								});
							};		
						// user settings passed in constructor
						if (this.getUser() && this.getPassword()) {
							this.login(
								this.getUser(), 
								this.getPassword(), 
								{ 
									async: true // keep this true 
								}
							);
						} 
						fnLoadMetadata();	
									
						
					}
				}
			);


			/**
			 * Disable parent methods which are not allowed to use
			 */
			if (_variables.mUnsupportedOperations.length) {
				var fnDisableOperation = function(sOperation) {
					if (! CRUDModel.hasOwnProperty(sOperation)) { return; }
					CRUDModel.prototype[sOperation] = function() {
						throw new Error("Unsupported operation: v4.ODataModel#isList");
					};
				};
				$.each(_variables.mUnsupportedOperations, function(i, sOperation) {
					fnDisableOperation(sOperation);
				});
			}


			/**
			 * Create Event attachers and detachers and fires
			 */			
			if (_variables.mSupportedEvents.length) {
				var fnCreateEvents = function(sEventId) {
					sEventId = sEventId.charAt(0).toUpperCase() + sEventId.slice(1);
					CRUDModel.prototype["attach"+sEventId] = function(oData, fnFunction, oListener) {
						return this.attachEvent(sEventId, oData, fnFunction, oListener);
					};
					CRUDModel.prototype["attach"+sEventId+"Once"] = function(oData, fnFunction, oListener) {
						return this.attachEventOnce(sEventId, oData, fnFunction, oListener);
					};
					CRUDModel.prototype["detach"+sEventId] = function(oData, fnFunction, oListener) {
						return this.detachEvent(sEventId, oData, fnFunction, oListener);
					};
					CRUDModel.prototype["detach"+sEventId+"Once"] = function(oData, fnFunction, oListener) {
						return this.detachEventOnce(sEventId, oData, fnFunction, oListener);
					};
					CRUDModel.prototype["fire"+sEventId] = function(mParameters, bAllowPreventDefault, bEnableEventBubbling) {
						_methods.debugLog(sEventId+" event fired");
						return this.fireEvent(sEventId, mParameters, bAllowPreventDefault, bEnableEventBubbling);
					};
				};
				$.each(_variables.mSupportedEvents, function(i, sEvent) {
					fnCreateEvents(sEvent);
				});
			}

			/**
			 * Call to the service
			 * @param  {string} sUrl           [description]
			 * @param  {object} mRequestParams [description]
			 * @return {xhr} 
			 */
			var __oServiceCalls = {};
			CRUDModel.prototype._serviceCall = function(sUrl, mRequestParams) {
				mRequestParams = mRequestParams || {};
				mRequestParams.error = (typeof mRequestParams.error == "function") ? mRequestParams.error : function(){} ;
				mRequestParams.success = (typeof mRequestParams.success == "function") ? mRequestParams.success : function(){} ;
				var aSplitGetParams		= sUrl.split("?"),
					url					= aSplitGetParams.shift(),
					oURLParams          = this.getServiceUrlParams(),
					bAsync				= ("async" in mRequestParams) ? mRequestParams.async : true,
					aGetParams			= [],
					that				= this;
				// remove first slash
				if (url && url.charAt(0) == "/") {
					url.substr(1);
				}
				// prepend serviceUrl
				url = this.getServiceUrl()+url;
				// prepare url params
				if (Object.keys(oURLParams).length) { // first existing serviceUrlParams
					for (var i in oURLParams) {
						aGetParams.push(i+'='+oURLParams[i]);
					}					
				}
				if (aSplitGetParams.length) { // second the params passed to the _serviceCall method
					aGetParams.push(aSplitGetParams.join("?"));	
				} 
				if (aGetParams.length) { // rebuild the URL 
					url = url+'?'+aGetParams.join("&");
				}
				var iServiceCallId = Date.now();
				// execute the request
				var oAjax = $.ajax({
					type		: mRequestParams.type || "GET",
					url			: url,
					data		: ("data" in mRequestParams) ? JSON.stringify(mRequestParams.data) : {},
					dataType	: "json",
					cache		: false, // NEVER!
					async		: bAsync,
					success		: mRequestParams.success,
					headers		: (_variables.csrf) ? { "X-CSRF-TOKEN" : _variables.csrf } : {},
					error		: function(xhr, textStatus, httpStatus) {
						if (httpStatus == "Unauthorized") {
							if (bAsync) {
								delete __oServiceCalls[iServiceCallId];
							}
							// abort all asynchronous service calls
							$.each(__oServiceCalls, function(i, xhr) {
								xhr.abort();
							});
							// fire logout
							// IMPORTANT: allways put this AFTER above sync abortions
							that.fireLogout();
							
						} 
						mRequestParams.error.apply(this, arguments);
					},
					complete	: function(xhr) {
						// request is completed so we can remove it from the servicecall pool
						if (bAsync) {
							delete __oServiceCalls[iServiceCallId];					
						}
					},
					beforeSend: function(jqXhr) {
						// add to servicecall array so we can abort them in case of logged out
						if (bAsync) {
							__oServiceCalls[iServiceCallId] = jqXhr;	
						}
					}
				});
				return oAjax;
			};


			/**
			* @see sap.ui.model.json.JSONModel.bindList
			* Lists are allways called from the api
			*/
			CRUDModel.prototype.bindList = function(sPath, oContext, aSorters, aFilters, mParameters) {
				_methods.execBind(this, this.resolve(sPath, oContext), aSorters, aFilters);
				return JSONModel.prototype.bindList.apply(this, arguments);
			};


			/**
			* @see sap.ui.model.json.JSONModel.bindProperty
			* Only called from the api when needed
			*/
			CRUDModel.prototype.bindProperty = function(sPath, oContext, mParameters) {
				var oParent = JSONModel.prototype.bindProperty.apply(this, arguments);
				sPath = this.resolve(sPath, oContext);
				if (sPath) {
					var	mPath	= _methods.parsePath(sPath);
					if (! mPath.Id) {
						return oParent;
					}
					var mModel = this.getProperty("/"+mPath.Table),
						that	= this;
					if (typeof mModel == "undefined" || ! (mPath.Id in mModel)) {
						_methods.execBind(this, mPath.Table, null, [
							new sap.ui.model.Filter(this.getPrimaryKey(mPath.Table), "EQ", mPath.Id)
						]);
					}
				}				
				return oParent;
			};


			/**
			* @see sap.ui.model.json.JSONModel.bindTree
			* TODO
			*/
			CRUDModel.prototype.bindTree = function(sPath, oContext, aFilters, mParameters, aSorters) {
				console.log('CRUDModel: TODO : bindTree');
				var oBinding = JSONModel.prototype.bindTree.apply(this, arguments);
				return oBinding;
			};

			
			/**
			 * Removes all operations in the current batch.
			 */
			CRUDModel.prototype.clearBatch = function(type) {
				if (! type) {
					this._oCRUDdata.oBatch = {};
				} else if (type in this._oCRUDdata.oBatch) {
					this._oCRUDdata.oBatch[type] = {};
				}
			};


			/**
			 * Trigger a POST request to the odata service that was specified in the model constructor. 
			 * Please note that deep creates are not supported and may not work.
			 * @param  {string} sPath					A string containing the path to the collection where an entry should be created. The path is concatenated to the sServiceUrl which was specified in the model constructor.
			 * @param  {object} oData					Data of the entry that should be created.
			 * @param  {object} mParameters.success		A callback function which is called when the data has been successfully retrieved.
			 * @param  {object} mParameters.error		A callback function which is called when the request failed. The handler can have the parameter oError which contains additional error information.
			 * @param  {object} mParameters.async		Whether the request should be done asynchronously. Default: false Please be advised that this feature is officially unsupported as using asynchronous requests can lead to data inconsistencies if the application does not make sure that the request was completed before continuing to work with the data
			 * @return {xhr} 
			 */
			CRUDModel.prototype.create = function(sPath, oData, mParameters) {
				mParameters = (typeof mParameters != "object") ? {} : mParameters;
				mParameters.success = (typeof mParameters.success == "function") ? mParameters.success : function(){};
				mParameters.error	= (typeof mParameters.error == "function") ? mParameters.error : function(){};
				oData				= (typeof oData == "object") ? oData : {};
				var mPath	= _methods.parsePath(sPath),
					that	= this;
				if (! mPath.Table) { 
					mParameters.error();
					return null;
				}
				// create new entry by metadata
				oData = _methods.generateCreateByMetadata(this, mPath.Table, oData);
				// batch or direct
				if (this.getUseBatch()) { // batch mode
					var any = this.createBatchOperation(sPath, "POST" , oData);
					if (any) {
						oData[this.getPrimaryKey(mPath.Table)] = any;
						mParameters.success(oData);
					} else {
						mParameters.error();
					}
				} else { // direct call
					return this._serviceCall(
						mPath.Table, 
						{
							type    : "POST",
							data    : _methods.parseCRUDPostData(this, mPath.Table, oData),
							success : function(iInserId) {
								oData[that.getPrimaryKey(mPath.Table)] = iInserId;
								mParameters.success(oData);
							},
							error   : mParameters.error,
							async   : ("async" in mParameters) ? mParameters.async : false // Default: false Please be advised that this feature is officially unsupported as using asynchronous requests can lead to data inconsistencies if the application does not make sure that the request was completed before continuing to work with the data.
						}
					);
				}
				
			};

			/**
			 * Creates a single batch operation (read or change operation) which can be used in a batch request.
			 * @param {string}	sPath	A string containing the path to the collection or entry where the batch operation should be performed. The path is concatenated to the sServiceUrl which was specified in the model constructor.
			 * @param {string}	sMethod	for the batch operation. Possible values are PUT, POST, DELETE (= LIST, UPDATE, CREATE, DELETE)
			 * @param {object}	oData?	optional data payload which should be created, updated, deleted in a change batch operation.
			 *  @return {boolean} true when succesfully added
			 *  + if its a POST it returns a the temporary Id of the newly created item
			 */
			CRUDModel.prototype.createBatchOperation = function(sPath, sMethod, oData) {
				var aMethods	= ["PUT", "POST", "DELETE"],
					mPath		= _methods.parsePath(sPath);
				oData = (typeof oData == "object") ? oData : {};
				oData = $.extend(true, {}, oData);
				// Proceed Checks
				if (! mPath.Table) { return false; } // invalid path 
				if (aMethods.indexOf(sMethod) === -1) { return false; } // invalid method
				if (["PUT", "POST"].indexOf(sMethod) !== -1 && Object.keys(oData).length === 0) {
					// if no data is passed in a post or put request
					return false;
				}	
				// create method objects in local _oCRUDdata
				for(var ikey in aMethods) {
					if (! (aMethods[ikey] in this._oCRUDdata.oBatch)) {
						this._oCRUDdata.oBatch[aMethods[ikey]] = {};
					}
				}
				// 
				if (["PUT", "POST"].indexOf(sMethod) !== -1) {
					oData = _methods.parseCRUDPostData(this, mPath.Table, oData);
				}
				// method specific handlers
				switch (sMethod) {

					case "PUT": // update
						if (! (mPath.Table in this._oCRUDdata.oBatch.PUT)) {
							// Create PUT array if not present
							this._oCRUDdata.oBatch.PUT[mPath.Table] = {};
						}
						if (! mPath.Id) { // invalid sPath
							return false; 
						} else if (mPath.Table in this._oCRUDdata.oBatch.DELETE && mPath.Id in this._oCRUDdata.oBatch.DELETE[mPath.Table]) {
							// allready in deletion list so can't be updated
							return false;
						} else if(mPath.Table in this._oCRUDdata.oBatch.POST && mPath.Id in this._oCRUDdata.oBatch.POST[mPath.Table]) {
							// allready in creation list
							this._oCRUDdata.oBatch.POST[mPath.Table][mPath.Id] = $.extend(true, this._oCRUDdata.oBatch.POST[mPath.Table][mPath.Id], oData);
							return true;
						} else if (mPath.Id in this._oCRUDdata.oBatch.PUT[mPath.Table]) { 
							// extend and overwrite existing update
							this._oCRUDdata.oBatch.PUT[mPath.Table][mPath.Id] = $.extend(true, this._oCRUDdata.oBatch.PUT[mPath.Table][mPath.Id], oData);
							return true;
						} else { 
							// add new update
							this._oCRUDdata.oBatch.PUT[mPath.Table][mPath.Id] = oData;
							return true;
						}
						break;

					case "POST": // create 
						if (! (mPath.Table in this._oCRUDdata.oBatch.POST)) {
							// create POST array if not present
							this._oCRUDdata.oBatch.POST[mPath.Table] = {};
						}
						// create a temporary id
						var Id = Date.now();
						oData[this.getPrimaryKey(mPath.Table)] = Id;
						this._oCRUDdata.oBatch.POST[mPath.Table][Id] = oData;
						return Id; // return before break
						break;

					case "DELETE": // delete
						// create deletion array if not present
						if (! (mPath.Table in this._oCRUDdata.oBatch.DELETE)) {
							this._oCRUDdata.oBatch.DELETE[mPath.Table] = [];
						}
						if (! mPath.Id) { // invalid sPath
							return false; 
						}
						// remove from update batch if needed
						if (mPath.Table in this._oCRUDdata.oBatch.PUT && mPath.Id in this._oCRUDdata.oBatch.PUT[mPath.Table]) {
							delete(this._oCRUDdata.oBatch.PUT[mPath.Table][mPath.Id]);
						} 
						// remove from create batch if needed
						if (mPath.Table in this._oCRUDdata.oBatch.POST && mPath.Id in this._oCRUDdata.oBatch.POST[mPath.Table]) {
							delete(this._oCRUDdata.oBatch.POST[mPath.Table][mPath.Id]);
							return true; // entry is not existing on the service so return true.
						} 
						// add to Deletion array if not allready present
						if(this._oCRUDdata.oBatch.DELETE[mPath.Table].indexOf(mPath.Id) === -1) {
							this._oCRUDdata.oBatch.DELETE[mPath.Table].push(mPath.Id);
							return true;
						}
						break;
				}
			};

			/* TODO > RETURN context object 
				TODO > create entry by metadada
			*/
			/**
			 * Creates an new 
			 * @param  {[type]} sPath [description]
			 * @param  {[type]} oData [description]
			 * @return {[type]}       [description]
			 */
			CRUDModel.prototype.createEntry = function(sPath, oData) {
				var mPath = _methods.parsePath(sPath);
				if (! mPath.Table) { return null; }
				// create by metadata
				oData = _methods.generateCreateByMetadata(this, mPath.Table, oData);
				var id = this.createBatchOperation(sPath, "POST" , oData);
				oData[this.getPrimaryKey(mPath.Table)] = id;
				JSONModel.prototype.setProperty.call(this, "/"+mPath.Table+"/"+id, oData);
				return id;
			};


			/**
			 * Checks if there exist pending changes in the model created by the setProperty method.
			 * @return {Boolean}
			 */
			CRUDModel.prototype.hasPendingChanges = function() {
				if (Object.keys(this._oCRUDdata.oBatch).length === 0) {
					return false;
				}
				for (var type in this._oCRUDdata.oBatch) {
					if (Object.keys(this._oCRUDdata.oBatch[type]).length === 0) {
						continue;
					}
					for (var sTable in this._oCRUDdata.oBatch[type]) {
						if (type == "DELETE") {
							if (this._oCRUDdata.oBatch[type][sTable].length) { return true; }
						} else if (Object.keys(this._oCRUDdata.oBatch[type][sTable]).length) {
							return true;
						} 
					}
				}			
				return false;
			};

			/**
			 * When the CRUD-api has [php-api-auth](https://github.com/mevdschee/php-api-auth) implemented, you first need to login
			 * @param  {string} sUsername   the user
			 * @param  {string} sPassword   the password
			 * @param  {object} mParameters success, error and async
			 */
			CRUDModel.prototype.login = function(sUsername, sPassword, mParameters) {
				mParameters = (typeof mParameters != "object") ? {} : mParameters;
				var that = this;
				this._serviceCall("", {
					type		: "POST",
					data		: {
						username : sUsername,
						password : sPassword						
					},
					success		: function(sCSRF) {
						_variables.csrf = sCSRF;
						that.fireLogin();
						if (typeof mParameters.success == "function") {
							mParameters.success();
						}
					},
					error		: mParameters.error || null,
					async		: ("async" in mParameters) ? mParameters.async  : false // def false
				});
			};

			/**
			 * Logout method
			 */
			CRUDModel.prototype.logout = function() {
				// Logout is done by calling a post request to the api without the csrf token
				_variables.csrf = null;
				this._serviceCall("", { type : "POST" });
				this.fireLogout();
			};


			/**
			 * Trigger a GET request to the odata service that was specified in the model constructor.
			 * The data will not be stored in the model. 
			 * The requested data is returned with the response.
			 * @param  {boolean}	mParameters.async?		Default: true	true for asynchronous requests.
			 * @param  {function}	mParameters.success?	a callback function which is called when the data has been successfully retrieved. The handler can have the following parameters: mResponse.
			 * @param  {function}	mParameters.error?		a callback function which is called when an error has occurred
			 * TODO sorters and urlParameters
			 */
			CRUDModel.prototype.read = function(sPath, mParameters) {
				// get the db columnn
				var mPath = _methods.parsePath(sPath);
				// Check and set api params
				mParameters = (typeof mParameters == "object") ? mParameters : {} ;
				var sUrl			= mPath.Table,
					that			= this,
					mAPIListParams	= {
						success: function(mResponse) {
							if (("success" in mParameters) && typeof mParameters.success == "function") {
								if (! mPath.Id) { // if the path = 0 . the response holds multiple entries
									mResponse = _methods.parseCRUDresultList(that, mPath.Table, mResponse);
								}
								mParameters.success(mResponse);
							}
						},
						error: mParameters.error || null,
						async	: ("async" in mParameters) ? mParameters.async  : true, // def true
						type: "GET" // read is allways get
					};
				// Filter
				if ("filters" in mParameters && $.isArray(mParameters.filters) && mParameters.filters.length ) {
					sUrl += "?"+_methods.parseUI5Filters(mParameters.filters);
				}
				// exec api call
				this._serviceCall(sUrl, mAPIListParams);
			};


			/**
			 * Sets a new value for the given property sPropertyName in the model without triggering a server request. This can be done by the submitChanges method.
			 * Note: Only one entry of one collection can be updated at once. Otherwise a fireRejectChange event is fired.
			 * Before updating a different entry the existing changes of the current entry have to be submitted or resetted by the corresponding methods: submitChanges, resetChanges.
			 * IMPORTANT: All pending changes are resetted in the model if the application triggeres any kind of refresh on that entry. Make sure to submit the pending changes first. To determine if there are any pending changes call the hasPendingChanges method.
			 * @param {string}	sPath        path of the property to set
			 * @param {any}		oValue       value to set the property to
			 * @param {object}	oContext     the context which will be used to set the property
			 */
			CRUDModel.prototype.setProperty = function(sPath, oValue, oContext) {
				var Parent = JSONModel.prototype.setProperty.apply(this, arguments);
				// check if the updatelist has to be notified
				if (oContext) {					
					var mPath = _methods.parsePath(oContext.getPath());
					// add table to update list if not existing
					this.createBatchOperation(
						mPath.Path, 
						"PUT", 
						$.extend(true, {}, this.getProperty(mPath.Path))
					);
				}
				return Parent;
			};


			/**
			 * Submits the collected changes which were collected by the setProperty method. 
			 * A MERGE request will be triggered to only update the changed properties. 
			 * Changes to this entries should be done on the entry itself. So no deep updates are supported.
			 * @param  {funcion} onSuccess	a callback function which is called when the data has been successfully updated. 
			 * @param  {funcion} onError	a callback function which is called when the request failed. The handler can have the parameter: oError which contains additional error information
			 */
			CRUDModel.prototype.submitChanges = function(fnSuccess, fnError) {
				fnSuccess	=  (typeof fnSuccess == "function") ? fnSuccess : function(){} ;
				fnError		=  (typeof fnError == "function") ? fnError : function(){} ;
				if (! this.hasPendingChanges()) {
					fnSuccess();
					return;
				}
				var oDeferred		= $.Deferred(),
					that			= this,
					oErrors			= {},
					submitCreates	= function() { 
						if (! ("POST" in that._oCRUDdata.oBatch) || Object.keys(that._oCRUDdata.oBatch.POST) === 0) {
							oDeferred.notify("Create");
						} else {
							var aPromises = [];
							for (var sTable in that._oCRUDdata.oBatch.POST) {
								if (Object.keys(that._oCRUDdata.oBatch.POST[sTable]).length === 0) { continue; }
								var aNewEntries = [],
									aCreatedIds = [];
								$.each(that._oCRUDdata.oBatch.POST[sTable], function(createdId, mEntry) {
									delete mEntry[that.getPrimaryKey(sTable)];
									aNewEntries.push(mEntry);
									aCreatedIds.push(createdId);
								});
								var xhr = that._serviceCall(sTable, {
										type: "POST",
										data: aNewEntries
									});
								xhr._Table		= sTable;
								xhr._CreatedIds = aCreatedIds;
								aPromises.push(xhr);
							}
							if (aPromises.length === 0) {
								oDeferred.notify("Create");
							} else {
								$.when.apply($, aPromises)
									.done(function(arr, type) {
										var mModelData	= that.getData(),
											fnProcess = function(oRes) {
												var sTable	= oRes[2]._Table;
												if(oRes[1] == "success" && oRes[0]) {
													// on succes replace the temporary id for the new one
													for (var key in oRes[0]) {
														var newId = oRes[0][key],
															oldId = oRes[2]._CreatedIds[key];
														var m = $.extend(true, {}, that.getProperty("/"+sTable+"/"+oldId), {});
														m[that.getPrimaryKey(oRes[2]._Table)] = newId;
														// delete old entry from model
														delete mModelData[sTable][oldId];
														// add new entry to modeldata
														mModelData[sTable][newId] = m;
														// remove entry from batch
														delete that._oCRUDdata.oBatch.POST[sTable][oldId];
														// remove table from batch
														if (Object.keys(that._oCRUDdata.oBatch.POST[sTable]).length === 0) {
															delete that._oCRUDdata.oBatch.POST[sTable];
														}
													}											
												} else {
													// add error
													if ( ! ("Create" in oErrors)) {
														oErrors.Create = that._oCRUDdata.oBatch.POST;
													}
												}
											};
										// 1 promise gives direct results..
										// muttiple will give multiple resultsets
										if (aPromises.length === 1) {
											fnProcess(arguments);
										} else {
											$.each(arguments, function(i, oRes) {
												fnProcess(oRes);											
											});
										}
										// reset model data
										that.setData(mModelData);
										// refresh binding data
										that.refresh(true);
										// progress callback
										oDeferred.notify("Create");
									})
									.fail(function() {
										if ( ! ("Create" in oErrors)) {
											oErrors.Create = that._oCRUDdata.oBatch.POST;
										}
										// progress callback
										oDeferred.notify("Create");
									});
							}
						}
					},
					submitUpdates = function() { // triggeres and promise when done
						if (! ("PUT" in that._oCRUDdata.oBatch) || Object.keys(that._oCRUDdata.oBatch.PUT) === 0) {
							oDeferred.notify("Update");
						} else { 
							var aPromises = [];
							for (var sTable in that._oCRUDdata.oBatch.PUT) {
								if (Object.keys(that._oCRUDdata.oBatch.PUT[sTable]).length === 0) { continue; }
								var aUpdates	= [],
									aIds		= [];
								$.each(that._oCRUDdata.oBatch.PUT[sTable], function(Id, mEntry) {
									delete mEntry[that.getPrimaryKey(sTable)];
									aUpdates.push(mEntry);
									aIds.push(Id);
								});
								var xhr = that._serviceCall(
									sTable+"/"+aIds.join(","), 
									{
										type: "PUT",
										data: aUpdates
									}
								);
								xhr._Table		= sTable;
								xhr._updateIds	= aIds;
								aPromises.push(xhr);
							}
							if (aPromises.length === 0) {
								oDeferred.notify("Update");
							} else {
								$.when.apply($, aPromises)
									.done(function(arr, type) {
										var fnProcess = function(oRes) {
											var sTable	= oRes[2]._Table;
											if(oRes[1] == "success" && oRes[0]) {
												// on succes remove the update from batch
												for (var key in oRes[0]) {
													var Id = oRes[2]._updateIds[key];
													// remove update from batch
													delete that._oCRUDdata.oBatch.PUT[sTable][Id];
													// remove table from batch
													if (Object.keys(that._oCRUDdata.oBatch.PUT[sTable]).length === 0) {
														delete that._oCRUDdata.oBatch.PUT[sTable];
													}
												}											
											} else {
												// add error
												if ( ! ("Update" in oErrors)) {
													oErrors.Update = that._oCRUDdata.oBatch.PUT;
												}
											}
										};
										// 1 promise gives direct results..
										// muttiple will give multiple resultsets
										if (aPromises.length === 1) {
											fnProcess(arguments);
										} else {
											$.each(arguments, function(i, oRes) {
												fnProcess(oRes);											
											});
										}										
										// progress callback
										oDeferred.notify("Update");
									})
									.fail(function() {
										if ( ! ("Update" in oErrors)) {
											oErrors.Update = that._oCRUDdata.oBatch.PUT;
										}
										// progress callback
										oDeferred.notify("Update");
									});
							}
						}
					},
					submitDeletes = function() {
						if (! ("DELETE" in that._oCRUDdata.oBatch) || Object.keys(that._oCRUDdata.oBatch.DELETE) === 0) {
							oDeferred.notify("Delete");
						} else { 
							var aPromises = [];
							for (var sTable in that._oCRUDdata.oBatch.DELETE) {
								if (Object.keys(that._oCRUDdata.oBatch.DELETE[sTable]).length === 0) { continue; }
								var aIds	= that._oCRUDdata.oBatch.DELETE[sTable],
									xhr		= that._serviceCall(
										sTable+"/"+aIds.join(","), 
										{
											type: "DELETE"
										}
									);
								xhr._Table		= sTable;
								xhr._deleteIds	= aIds;
								aPromises.push(xhr);	
							}
							if (aPromises.length === 0) {
								oDeferred.notify("Delete");
							} else {
								$.when.apply($, aPromises)
									.done(function(arr, type) {
										var fnProcess = function(oRes) {
											var sTable	= oRes[2]._Table;
											if(oRes[1] == "success" && oRes[0]) {
												// on succes remove the update from batch
												if (! $.isArray(oRes[0]) && oRes[0] == 1) {
													// its only one so delete direct
													delete that._oCRUDdata.oBatch.DELETE[sTable];
												} else {
													for (var key in oRes[0]) {
														if (oRes[0][key] != 1) {
															// add error
															if ( ! ("Delete" in oErrors)) {
																oErrors.Delete = that._oCRUDdata.oBatch.DELETE;
															}
															continue;
														}
														var Id = oRes[2]._deleteIds[key];
														// remove update from batch
														delete that._oCRUDdata.oBatch.DELETE[sTable][that._oCRUDdata.oBatch.DELETE[sTable].indexOf(Id)];
														// remove table from batch
														if (Object.keys(that._oCRUDdata.oBatch.DELETE[sTable]).length === 0) {
															delete that._oCRUDdata.oBatch.DELETE[sTable];
														}
													}
													// reset keys when error occurs
													if (Object.keys(that._oCRUDdata.oBatch.DELETE[sTable]).length) {
														that._oCRUDdata.oBatch.DELETE[sTable] = that._oCRUDdata.oBatch.DELETE[sTable].filter(function(){return true;});
													}
												}										
											} else {
												// add error
												if ( ! ("Delete" in oErrors)) {
													oErrors.Delete = that._oCRUDdata.oBatch.DELETE;
												}
											}
										};
										// 1 promise gives direct results..
										// muttiple will give multiple resultsets
										if (aPromises.length === 1) {
											fnProcess(arguments);
										} else {
											$.each(arguments, function(i, oRes) {
												fnProcess(oRes);											
											});
										}										
										// progress callback
										oDeferred.notify("Delete");
									})
									.fail(function() {
										if ( ! ("Delete" in oErrors)) {
											oErrors.Delete = that._oCRUDdata.oBatch.DELETE;
										}
										// progress callback
										oDeferred.notify("Delete");
									});
							}
						}
					};
				// first create then update then delete then we're ready
				oDeferred.progress(function(status) {
					switch (status) {
						case "Start":
							_methods.debugLog("submitCreates started", "submitChanges");
							submitCreates();
							break;

						case "Create": 
							_methods.debugLog("submitUpdates started", "submitChanges");
							submitUpdates();
							break;

						case "Update":
							_methods.debugLog("submitDeletes started", "submitChanges");
							submitDeletes();
							break;

						case "Delete":
							// resolve since we're ready
							oDeferred.resolve();
							break;
					}
				});
				$.when(oDeferred).done(function() {
					_methods.debugLog("Batch done");
					if (Object.keys(oErrors).length) {
						fnError(oErrors);
					} else {
						fnSuccess();
					}
				});
				// Start the deferred progress
				_methods.debugLog("Batch started");
				oDeferred.notify("Start");
			};


			/**
			 * Reloads all data from the API server but keep the batch
			 * @param  {function} fnSuccess a callback function which is called when the data has been successfully reloaded.
			 * @param  {functino} fnError   error callback
			 */
			CRUDModel.prototype.reload = function(fnSuccess, fnError) {
				this.setData({});
				_methods.reloadBinds(fnSuccess, fnError);
				// this.fireReload({
				// 	test: "test"
				// }); //_methods.execBind
				// if (typeof fnSuccess !== "function") {
				// 	fnSuccess = function(){};
				// }
				// if (typeof fnError !== "function") {
				// 	fnError = function(){};
				// }
				// var mOldData	= this.getData("/"),
				// 	aPromises	= [];
				// if (! mOldData) {
				// 	return fnSuccess();
				// }
				// // Create and exec api calls
				// var sPrimaryKey = this.getPrimaryKey(),
				// 	that = this;
				// $.each(mOldData, function(sTableName, mTableEntries) {
				// 	var aKeys = Object.keys(mTableEntries);
				// 	if (aKeys.length === 0) { return; }
				// 	var sUrl = sTableName+"?filter="+sPrimaryKey+",in,"+aKeys.join(",");
				// 	aPromises.push(that._serviceCall(sUrl));
				// });
				// // Exec when all api calls are done
				// $.when.apply($, aPromises)
				// 	.done(function() {
				// 		var mNewData = {};
				// 		$.each(arguments, function(i, mArg) {
				// 			if (mArg[1] != "success") { return ; }
				// 			var sTableName = Object.keys(mArg[0])[0];
				// 			mNewData[sTableName] = _methods.parseCRUDresultList(that, sTableName, mArg[0]);
				// 		});
				// 		// remove update data
				// 		that.clearBatch();
				// 		// set the new data
				// 		that.setData(mNewData);
				// 		// refresh binding data
				// 		that.refresh(true);
				// 		// user callback
				// 		fnSuccess();
				// 	}).fail(function() {
				// 		fnError();
				// 	});
			};


			/**
			 * Trigger a DELETE request to the odata service that was specified in the model constructor.
			 * @param	{object}	jquery xhr object (which has an abort function to abort the current request.)
			 * @param	{object}	mParameters.context?	If specified the sPath has to be relative to the path given with the context.
			 * @param	{function}	mParameters.success?	A callback function which is called when the data has been successfully retrieved. The handler can have the following parameters: oData and response.
			 * @param	{function}	mParameters.error?		A callback function which is called when the request failed. The handler can have the parameter: oError which contains additional error information.
			 * @param	{boolean}	mParameters.async?		Whether the request should be done asynchronously. Please be advised that this feature is officially unsupported as using asynchronous requests can lead to data inconsistencies if the application does not make sure that the request was completed before continuing to work with the data.
			 * @return  {XHR object} only when its not in batch mode
			 */
			CRUDModel.prototype.remove = function(sPath, mParameters) {
				var mPath	= _methods.parsePath(sPath),
					that	= this;
				mParameters = (typeof mParameters == "object") ? mParameters : {} ;
				mParameters.error	= (typeof mParameters.error == "function") ? mParameters.error : function(){} ;
				mParameters.success = (typeof mParameters.success == "function") ? mParameters.success : function(){} ;
				if ("context" in mParameters) {
					sPath = this.resolve(sPath, mParameters.context);
				}
				// check path
				if ( ! ("Table" in mPath && "Id" in mPath)) { 
					mParameters.error();
					return ;
				}
				if (this.getUseBatch()) {
					// add to batch
					this.createBatchOperation(
						mPath.Path, 
						"DELETE"
					);
					// direct delete from model
					var m = this.getProperty("/"+mPath.Table);
					if (mPath.Id in m) { // only remove from model if it's available
						delete m[mPath.Id];
						JSONModel.prototype.setProperty.call(this, "/"+mPath.Table, m);	
					}
					// usercallback
					mParameters.success();
				} else {
					// direct process
					return this._serviceCall(
						mPath.Path,
						{
							type		: "DELETE",
							success		: function(response) {
								if (response == "0") {
									mParameters.error();
								} else {
									var m = that.getProperty("/"+mPath.Table);
									delete m[mPath.Id];
									JSONModel.prototype.setProperty.call(that, "/"+mPath.Table, m);
									// refresh binding data
									that.refresh(true);
									// callback
									mParameters.success.apply(this, arguments);
								} 
							},
							error		: mParameters.error,
							async		: ("async" in mParameters) ? mParameters.async : false // def false
						}
					);
				}
			};


			/**
			 * Resets the collected changes by the setProperty method and reloads the data from the server. 
			 * @param  {function} fnSuccess a callback function which is called when the data has been successfully resetted. The handler can have the following parameters: oData and response.
			 */
			CRUDModel.prototype.resetChanges = function(fnSuccess, fnError) {
				if (typeof fnSuccess !== 'function') {
					fnSuccess = function(){};
				}
				var that = this;
				this.reload.call(
					this, 
					function onSucces(){
						that.clearBatch();
					},
					fnError
				);
			};


			/**
			 * Trigger a PUT request to the service that was specified in the model constructor.
			 * Please note that deep updates are not supported and may not work. 
			 * These should be done seperate on the entry directly.
			 * @param	{string}	sPath					A string containing the path to the data that should be updated. The path is concatenated to the sServiceUrl which was specified in the model constructor.
			 * @param	{object}	mData					Data of the entry that should be updated.
			 * @param	{function}	mParameters.success		A callback function which is called when the data has been successfully updated.
			 * @param	{function}	mParameters.error		A callback function which is called when the request failed. The handler can have the parameter oError which contains additional error information
			 * @return	{object}	only if not usning batchmode: jquery xhr object (which has an abort function to abort the current request.)
			 */
			CRUDModel.prototype.update = function(sPath, mData, mParameters) {
				var mPath	= _methods.parsePath(sPath),
					that	= this;
				mParameters			= (typeof mParameters == "object") ? mParameters : {} ;
				mParameters.error	= (typeof mParameters.error == "function") ? mParameters.error : function(){} ;
				mParameters.success = (typeof mParameters.success == "function") ? mParameters.success : function(){} ;
				if (! mPath.Table || ! mPath.Id ) {
					if ("error" in mParameters && typeof mParameters.error == "function") {
						mParameters.error();
					}
					return null;
				}
				if (this.getUseBatch())	{
					this.createBatchOperation(
						mPath.Path,
						"PUT",
						mData
					);
					// update the internal data if needed
					var m = this.getProperty("/"+mPath.Table);
					if (mPath.Id in m) {
						m[mPath.Id] = $.extend(true, m[mPath.Id], mData);
						JSONModel.prototype.setProperty.call(this, "/"+mPath.Table, m[mPath.Id]);
					}
					// user callback
					mParameters.success();
				} else {
					return this._serviceCall(
						mPath.Path,
						{
							type    : "PUT",
							data    : _methods.parseCRUDPostData(this, mPath.Table, mData),
							success : function(response) {
								if (response == "1") {
									var m = that.getProperty("/"+mPath.Table);
									if (mPath.Id in m) {										
										m[mPath.Id] = $.extend(true, m[mPath.Id], mData);
										JSONModel.prototype.setProperty.call(that, "/"+mPath.Table, m[mPath.Id]);
									}
									// user callback
									mParameters.success();
								} else {
									mParameters.error(response);
								}
							},
							error   : mParameters.error || null,
							async   : ("async" in mParameters) ? mParameters.async : true // def true
						}
					);
				}	
				
			};

			return CRUDModel;
			
		},
		true // bExport	
	);

})(jQuery, window);