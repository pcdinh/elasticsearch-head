(function() {
	var es = window.es = {};

	es.ElasticSearchHead = acx.ui.Widget.extend({
		defaults: {
			base_uri: "http://localhost:9200/"   // the default ElasticSearch host
		},
		init: function(parent) {
			this._super();
			this._initElements(parent);
		},
		
		open: function(widget, jEv) {
			var t = $(jEv.target).closest("DIV.es-header-menu-item").addClass("active").siblings().removeClass("active");
			this.el.find("#"+this.id("body")).empty().append(widget);
		},
		
		_openAnyQuery_handler: function(jEv) { this.open(new es.AnyQuery({ base_uri: this.config.base_uri }), jEv);  },
		_openStructuredQuery_handler: function(jEv) { this.open(new es.StructuredQuery({ base_uri: this.config.base_uri }), jEv);  },
		_openClusterHealth_handler: function(jEv) { this.open(new es.SimpleGetQuery({ base_uri: this.config.base_uri, path: "_cluster/health" }), jEv); },
		_openClusterState_handler: function(jEv) { this.open(new es.SimpleGetQuery({ base_uri: this.config.base_uri, path: "_cluster/state" }), jEv); },
		_openClusterNodes_handler: function(jEv) { this.open(new es.SimpleGetQuery({ base_uri: this.config.base_uri, path: "_cluster/nodes" }), jEv); },
		_openStatus_handler: function(jEv) { this.open(new es.SimpleGetQuery({ base_uri: this.config.base_uri, path: "_status" }), jEv); },
		
		_initElements: function(parent) {
			this.el = $(this._main_template());
			this.appendTo(parent);
		},

		_main_template: function() {
			return { tag: "DIV", cls: "es", children: [
				{ tag: "DIV", id: this.id("header"), cls: "es-header", children: [
					{ tag: "DIV", cls: "es-header-top", children: [
						new es.Cluster({ base_uri: this.config.base_uri }),
						{ tag: "H1", text: "ElasticSearch" }
					]},
					{ tag: "DIV", cls: "es-header-menu", children: [
						{ tag: "DIV", cls: "es-header-menu-item es-left", text: "Any Query", onclick: this._openAnyQuery_handler },
						{ tag: "DIV", cls: "es-header-menu-item es-left", text: "Structured Query", onclick: this._openStructuredQuery_handler },
						{ tag: "DIV", cls: "es-header-menu-item es-right", text: "Cluster Health", onclick: this._openClusterHealth_handler },
						{ tag: "DIV", cls: "es-header-menu-item es-right", text: "Cluster State", onclick: this._openClusterState_handler },
						{ tag: "DIV", cls: "es-header-menu-item es-right", text: "Cluster Nodes", onclick: this._openClusterNodes_handler },
						{ tag: "DIV", cls: "es-header-menu-item es-right", text: "Status", onclick: this._openStatus_handler }
					]}
				]},
				{ tag: "DIV", id: this.id("body") }
			]};
		}
	});
	
	es.AbstractQuery = acx.ui.Widget.extend({
		defaults: {
			base_uri: "http://localhost:9200/"   // the default ElasticSearch host
		},

		_request_handler: function(params) {
			$.ajax(acx.extend({
				url: this.config.base_uri + params.path,
				type: "POST",
				dataType: "json",
				error: function(xhr) { console.log("XHR error", arguments, xhr_responseText); }
            }, params));
		}
	});
	
	es.Cluster = es.AbstractQuery.extend({
		
		init: function(parent) {
			this._super();
			this.el = $(this._main_template());
			this.appendTo(parent);
			this.nameEl = this.el.find(".es-header-clusterName");
			this.statEl = this.el.find(".es-header-clusterStatus");
			this.statEl.text("cluster health: not connected").css("background", "red");
			this._request_handler({ type: "GET", path: "", success: this._node_handler });					
			this._request_handler({	type: "GET", path: "_cluster/health", success: this._health_handler	});					
		},
		
		_node_handler: function(data) {
			this.nameEl.text(data.name);
		},
		
		_health_handler: function(data) {
			this.statEl.text("cluster health: " + data.status + " (" + data.number_of_nodes + ", " + data.active_primary_shards + ")").css("background", data.status);
		},
		
		_reconnect_handler: function() {
			$("body").empty().append(new es.ElasticSearchHead("body", { id: "es", base_uri: this.el.find(".es-header-uri").val()}));
		},
		
		_main_template: function() {
			return { tag: "SPAN", cls: "es-cluster", children: [
				{ tag: "INPUT", type: "text", cls: "es-header-uri", id: this.id("baseUri"), value: this.config.base_uri },
				{ tag: "BUTTON", type: "button", text: "Connect", onclick: this._reconnect_handler },
				{ tag: "SPAN", cls: "es-header-clusterName" },
				{ tag: "SPAN", cls: "es-header-clusterStatus" }
			]};
		}
	});
	
	es.AnyQuery = es.AbstractQuery.extend({
		defaults: {
			default_query: "{query:{\"match_all\" : {}}}"
		},
		init: function(parent) {
			this._super();
			this._initElements();
			this.appendTo(parent);
		},

		_request_handler: function() {
			console.log("_request_handler");
			this._super({
				url: this.el.find("#q-url").val(),
				type: this.el.find("#q-method").val(),
				data: this.el.find("#q-body").val().trim(),
				success: this._responseWriter_handler,
            });
		},
		
		_responseWriter_handler: function(data) {
			console.log("_responseWriter_handler", data);
			this.el.find("PRE.es-out").text(JSON.stringify(data, null, '    '));
		},
		
		_initElements: function() {
			this.el = $(this._main_template());
		},
		
		_main_template: function() {
			return { tag: "DIV", children: [
				{ tag: "DIV", cls: "es-conf", children: [
					{ tag: "INPUT", type: "text", id: "q-url", value: this.config.base_uri },
					{ tag: "SELECT", id: "q-method", children: ["POST", "GET", "PUT"].map(function(m) { return { tag: "OPTION", value: m, text: m }; }) },
					{ tag: "BUTTON", type: "button", text: "Go", onclick: this._request_handler },
					{ tag: "BR" },
					{ tag: "TEXTAREA", id: "q-body", rows: 10, cols: 80, text: this.config.default_query }
				] },
				{ tag: "PRE", cls: "es-out" }
			] };
		}
	});
	
	es.SimpleGetQuery = es.AbstractQuery.extend({
		defaults: {
			path: "" // required
		},
		
		init: function(parent) {
			this._super();
			this.el = $(this._main_template());
			this.appendTo(parent);
			this.update_handler();
		},
		
		update_handler: function() {
			this._request_handler({
				path: this.config.path,
				type: "GET",
				success: function(data) {
					this.el.find(".es-out").text(JSON.stringify(data, null, '    '));
				}.bind(this)
			});
		},

		_main_template: function() {
			return { tag: "DIV", child: { tag: "PRE", cls: "es-out" } };
		}
	});
	
	es.StructuredQuery = es.AbstractQuery.extend({
		init: function(parent) {
			this._super();
			this.selector = new es.IndexSelector({
				onIndexChanged: this._indexChanged_handler,
				base_uri: this.config.base_uri
			});
			this.el = $(this._main_template());
			this.appendTo(parent);
		},
		
		_indexChanged_handler: function(index) {
			this.el.find(".es-structuredQuery-body").empty().append(new es.FilterBrowser({ base_uri: this.config.base_uri, index: index }));
		},
		
		_main_template: function() {
			return { tag: "DIV", children: [
				this.selector,
				{ tag: "DIV", cls: "es-structuredQuery-body" }
			]};
		}
	});
	
	es.FilterBrowser = es.AbstractQuery.extend({
		defaults: {
			index: "" // required name of the index to query
		},

		init: function(parent) {
			this._super();
			this.el = $(this._main_template());
			this.appendTo(parent);
			this._request_handler({ type: "GET", path: this.config.index + "/_mapping", success: this._createFilters_handler });
		},

		_createFilters_handler: function(data) {
			var filters = this.filters = [];
			function scan_properties(path, obj) {
				if(obj.properties) {
					for(var prop in obj.properties) {
						scan_properties(path.concat(prop), obj.properties[prop]);
					}
				} else {
					filters.push( { path: path.join("."), type: obj.type, used: false, meta: obj } );
				}
			}
			for(var type in data[this.config.index]) {
				scan_properties([type], data[this.config.index][type]);
			}
			this._addFilterRow();
		},
		
		_addFilterRow: function() {
			this.el.find(".es-filterBrowser-filters").append(this._filter_template());
		},
		
		_main_template: function() {
			return { tag: "DIV", children: [
				{ tag: "DIV", cls: "es-filterBrowser-filters" },
				{ tag: "DIV", cls: "es-filterBrowser-results" }
			]}
		},
		
		_filter_template: function() {
		console.log(this);
			return { tag: "SELECT", cls: "es-filter", children: this.filters.map(function(f) {
				return f.used ? null : { tag: "OPTION", value: f.path, text: "[" + f.type + "] " + f.path };
			}) };
		}
	});
	
	es.IndexSelector = es.AbstractQuery.extend({
		init: function(parent) {
			this._super();
			this.el = $(this._main_template());
			this.appendTo(parent);
			this.update();
		},
		update: function() {
			this._request_handler({
				type: "GET",
				path: "_status",
				success: this._update_handler
			});
		},
		
		_update_handler: function(data) {
			console.log(data);
		    var options = [];
			for(var name in data.indices) { options.push(this._option_template(name, data.indices[name])); }
			console.log(options);
			this.el.find(".es-indexSelector-select").empty().append(this._select_template(options));
			this._indexChanged_handler();
		},
		
		_main_template: function() {
			return { tag: "DIV", children: [ 
			    "Select an index: ",
				{ tag: "SPAN", cls: "es-indexSelector-select" }
			] };
		},

		_indexChanged_handler: function() {
			this.fire("indexChanged", this.el.find("SELECT").val());
		},

		_select_template: function(options) {
			return { tag: "SELECT", children: options, onChange: this._indexChanged_handler };
		},
		
		_option_template: function(name, index) {
			return  { tag: "OPTION", value: name, text: name + " (" + index.docs.num_docs + " docs)" };
		}
	});
})();












