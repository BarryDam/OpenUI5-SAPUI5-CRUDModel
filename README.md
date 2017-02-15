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

[clearBatch](#clearBatch)
[create](#create)
[createBatchOperation](#createBatchOperation)
[createEntry](#createEntry)
[hasPendingChanges](#hasPendingChanges)
[login](#login)
[logout](#logout)
[read](#read)
[setProperty](#setProperty)
[submitChanges](#submitChanges)
[resetChanges](#resetChanges)
[reload](#reload)
[remove](#remove)
[update](#update)


###clearBatch


###create


###createBatchOperation


###createEntry


###hasPendingChanges


###login


###logout


###read


###setProperty


###submitChanges


###resetChanges


###reload


###remove


###update



## BUY ME A BEER
[![PayPayl donate button](https://img.shields.io/badge/paypal-donate-yellow.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=XX68BNMVCD7YS "Donate once-off to this project using Paypal")