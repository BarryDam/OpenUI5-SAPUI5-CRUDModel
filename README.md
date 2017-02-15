# OpenUI5-SAPUI5-CRUDModel

[OpenUI5](http://openui5.org/)/[SAPUI5](https://sapui5.hana.ondemand.com) Model implementation for [mevdschee/php-crud-api](https://github.com/mevdschee/php-crud-api)

## Setup in UI5
1. Add the CRUDModel.js file to you project folder library/bd/model/
2. In your Component.js file add the following lines
```javascript
jQuery.sap.registerModulePath("nl.barrydam", "library/bd/");
jQuery.sap.require("nl.barrydam.model.CRUDModel");
```

## Contructor
**new nl.barrydam.model.CRUDModel(sServiceUrl, mParameters?)**

Constructor for a new CRUDModel.

**Parameters:**

Type 				| Variable 							| Description
--- 				| --- 								| ---
*{string}*			| **sServiceUrl** 					| Base uri of the service to request data from; additional URL parameters appended here will be appended to every request can be passed with the mParameters object as well
*{object}*			| **mParameters?**					| (optional) a map which contains the following parameter properties:
*{string}*			| **mParameters.bindingMode?**		| Set the binding mode for the model (OneWay or TwoWay, default = TwoWay)
*{string}*			| **mParameters.user?**				| User for the service
*{string}*			| **mParameters.password?**			| Password for service
*{string}*			| **mParameters.primaryKey?**		| Database primary key (default = 'id')
*{map}*				| **mParameters.serviceUrlParams?**	| Map of URL parameters - these parameters will be attached to all requests
*{boolean}*			| **mParameters.useBatch?**			| When true all POST PUT and DELETE requests will be sent in batch requests (default = false)

## Events
The following events can be triggered by the CRUDModel: Login, Logout, MetadataFailed, MetadataLoaded, Reload.

You can catch them by using the following methods: attachLogin, attachLogout, attachMetadataFailed, attachMetadataLoaded, attachReload.

Or once: You can catch them by using the following methods: attachLoginOnce, attachLogoutOnce, attachMetadataFailedOnce, attachMetadataLoadedOnce, attachReloadOnce.

**Example**
```javascript
oCRUD.attachLogin(function() {
	alert("User has logged in");
});
```

## Method detail

[clearBatch](#clearBatch),
[create](#create),
[createBatchOperation](#createBatchOperation),
[createEntry](#createEntry),
[hasPendingChanges](#hasPendingChanges),
[login](#login),
[logout](#logout),
[read](#read),
[setProperty](#setProperty),
[submitChanges](#submitChanges),
[resetChanges](#resetChanges),
[reload](#reload),
[remove](#remove),
[update](#update)

Note: nl.barrydam.CRUDModel is an extension of [sap.ui.model.json.JSONModel](https://sapui5.hana.ondemand.com/#docs/api/symbols/sap.ui.model.json.JSONModel.html) all methods of the JSONModel can also be used except the "loadData" method

###clearBatch()
Removes all operations in the current batch.


###create(sPath, oData, mParmeters?)
Trigger a POST request to the CRUD service that was specified in the model constructor. Please note that deep creates are not supported and may not work. 

**Parameters:**

Type 				| Variable 							| Description
--- 				| --- 								| ---
*{string}*			| **sPath** 						| 	A string containing the path to the collection where an entry should be created. The path is concatenated to the sServiceUrl which was specified in the model constructor.
*{object}*			| **oData** 						| Data of the entry that should be created.
*{map}*				| **mParameters?** 					| Optional parameter map containing any of the following properties:
*{function}*		| **mParameters.success?** 			| A callback function which is called when the data has been successfully retrieved. The handler can have the following parameters: oData and response.created.
*{function}*		| **mParameters.error?** 			| a callback function which is called when the request failed. The handler can have the parameter oError which contains additional error information.
*{boolean}*			| **mParameters.async?** 			| Whether the request should be done asynchronously. Default: false Please be advised that this feature is officially unsupported as using asynchronous requests can lead to data inconsistencies if the application does not make sure that the request was completed before continuing to work with the data.


###createBatchOperation(sPath, sMethod, oData?)
Creates a single batch operation (read or change operation) which can be used in a batch request.

**Parameters:**

Type 				| Variable 							| Description
--- 				| --- 								| ---
*{string}*			| **sPath** 						| 	A string containing the path to the collection where an entry should be created. The path is concatenated to the sServiceUrl which was specified in the model constructor.
*{string}*			| **sMethod** 						| for the batch operation. Possible values are GET, PUT, MERGE, POST, DELETE
*{object}*			| **oData?** 						| optional data payload which should be created, updated, deleted in a change batch operation.


###createEntry(sPath, oData?)
Creates a new entry object which is described by the metadata of the entity type of the specified sPath Name. A context object is returned which can be used to bind against the newly created object.

For each created entry a request is created and stored in a request queue. The request queue can be submitted by calling [submitChanges](#submitChanges). To delete a created entry from the request queue call [deleteCreateEntry](#deleteCreateEntry).

The optional oData parameter can be used as follows:

If oData is not specified, all properties in the entity type will be included in the created entry.

If there are no values specified the properties will have undefined values.

Please note that deep creates (including data defined by navigationproperties) are not supported

**Parameters:**

Type 				| Variable 							| Description
--- 				| --- 								| ---
*{string}*			| **sPath** 						| Name of the path to the collection.
*{object}*			| **oData** 						| An object that specifies a set of properties or the entry

###hasPendingChanges()
Checks if there exist pending changes in the model created by the setProperty method.

**returns**
*{boolean}*	true/false


###login(sUser, sPassword, mParameters?)
When the CRUD-api has [php-api-auth](https://github.com/mevdschee/php-api-auth) implemented, you first need to login. Note: this method fires a request with serviceUrl param _a=login

**Parameters:**

Type 				| Variable 							| Description
--- 				| --- 								| ---
*{string}*			| **sUser** 						| User for the service
*{string}*			| **sPassword** 					| password for the service
*{map}*				| **mParameters?** 					| Optional parameter map containing any of the following properties:
*{function}*		| **mParameters.success?** 			| A callback function which is called when the data has been successfully retrieved. The handler can have the following parameters: oData and response.created.
*{function}*		| **mParameters.error?** 			| a callback function which is called when the request failed. The handler can have the parameter oError which contains additional error information.
*{boolean}*			| **mParameters.async?** 			| Whether the request should be done asynchronously. Default: false Please be advised that this feature is officially unsupported as using asynchronous requests can lead to data inconsistencies if the application does not make sure that the request was completed before continuing to work with the data.

###logout()
Logs the user out when the CRUD-api has [php-api-auth](https://github.com/mevdschee/php-api-auth) implemented.


###read(sPath, mParameters?)
Trigger a GET request to the odata service that was specified in the model constructor. The data will not be stored in the model. The requested data is returned with the response.

**Parameters:**

Type 				| Variable 							| Description
--- 				| --- 								| ---
*{string}*			| **sPath** 						| 	A string containing the path to the collection where an entry should be created. The path is concatenated to the sServiceUrl which was specified in the model constructor.
*{map}*				| **mParameters?** 					| Optional parameter map containing any of the following properties:
*{function}*		| **mParameters.success?** 			| A callback function which is called when the data has been successfully retrieved. The handler can have the following parameters: oData and response.created.
*{function}*		| **mParameters.error?** 			| a callback function which is called when the request failed. The handler can have the parameter oError which contains additional error information.
*{boolean}*			| **mParameters.async?** 			| Whether the request should be done asynchronously. Default: false Please be advised that this feature is officially unsupported as using asynchronous requests can lead to data inconsistencies if the application does not make sure that the request was completed before continuing to work with the data.


###setProperty(sPath, oValue)
Sets a new value for the given property sPropertyName in the model without triggering a server request. This can be done by the [submitChanges](#submitChanges) method.
Note: Only one entry of one collection can be updated at once. Otherwise a fireRejectChange event is fired.

Before updating a different entry the existing changes of the current entry have to be submitted or resetted by the corresponding methods: [submitChanges](#submitChanges), resetChanges.

IMPORTANT: All pending changes are resetted in the model if the application triggeres any kind of refresh on that entry. Make sure to submit the pending changes first. To determine if there are any pending changes call the [hasPendingChanges](#hasPendingChanges) method.

**Parameters:**

Type 				| Variable 							| Description
--- 				| --- 								| ---
*{string}*			| **sPath** 						| Path of the property to set
*{any}*				| **oValue** 						| value to set the property to

**Returns** *{boolean}*	true if the value was set correctly and false if errors occurred like the entry was not found or another entry was already updated.


###submitChanges(fnSuccess?, fnError?)
Submits the collected changes which were collected by the setProperty method. A MERGE request will be triggered to only update the changed properties. If a URI with a $expand System Query Option was used then the expand entries will be removed from the collected changes. Changes to this entries should be done on the entry itself. So no deep updates are supported.

**Parameters:**

Type 				| Variable 							| Description
--- 				| --- 								| ---
*{function}*		| **fnSuccess?** 					| 	a callback function which is called when the data has been successfully updated. The handler can have the following parameters: oData and response.
*{function}*		| **fnError?** 						| 	a callback function which is called when the request failed. The handler can have the parameter: oError which contains additional error information

**Returns** *{object}* An object which has an abort function to abort the current request.


###remove(sPath, mParameters?)
Trigger a DELETE request to the odata service that was specified in the model constructor.

**Parameters:**

Type 				| Variable 							| Description
--- 				| --- 								| ---
*{string}*			| **sPath** 						| 	A string containing the path to the data that should be removed. The path is concatenated to the sServiceUrl which was specified in the model constructor.
*{map}*				| **mParameters?** 					| Optional parameter map containing any of the following properties:
*{function}*		| **mParameters.success?** 			| A callback function which is called when the data has been successfully retrieved. The handler can have the following parameters: oData and response.created.
*{function}*		| **mParameters.error?** 			| a callback function which is called when the request failed. The handler can have the parameter oError which contains additional error information.
*{boolean}*			| **mParameters.async?** 			| Whether the request should be done asynchronously. Default: false Please be advised that this feature is officially unsupported as using asynchronous requests can lead to data inconsistencies if the application does not make sure that the request was completed before continuing to work with the data.


###resetChanges(fnSuccess?, fnError?)
Resets the collected changes by the setProperty method and reloads the data from the server.

**Parameters:**

Type 				| Variable 							| Description
--- 				| --- 								| ---
*{function}*		| **fnSuccess?** 					| 	a callback function which is called when the data has been successfully updated. The handler can have the following parameters: oData and response.
*{function}*		| **fnError?** 						| 	a callback function which is called when the request failed. 


###reload
Reloads the data from the server and keeps the colleted changes.

**Parameters:**

Type 				| Variable 							| Description
--- 				| --- 								| ---
*{function}*		| **fnSuccess?** 					| 	a callback function which is called when the data has been successfully updated. The handler can have the following parameters: oData and response.
*{function}*		| **fnError?** 						| 	a callback function which is called when the request failed. 




###update



## BUY ME A BEER
[![PayPayl donate button](https://img.shields.io/badge/paypal-donate-yellow.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=XX68BNMVCD7YS "Donate once-off to this project using Paypal")