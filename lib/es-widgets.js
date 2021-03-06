(function() {
	var es = window.es;

	es.ui = {};

	es.ui.QueryFilter = acx.ui.Widget.extend({
		defaults: {
			metadata: null,   // (required) instanceof es.MetaData
			query: null       // (required) instanceof es.Query that the filters will act apon
		},
		init: function() {
			this._super();
			this.metadata = this.config.metadata;
			this.query = this.config.query;
			this.el = $(this._main_template());
		},
		_selectAlias_handler: function(jEv) {
			var indices = (jEv.target.selectedIndex === 0) ? [] : this.metadata.getIndices($(jEv.target).val());
			$(".queryFilter-index").each(function(i, el) {
				var jEl = $(el);
				if(indices.contains(jEl.text()) !== jEl.hasClass("selected")) {
					jEl.click();
				}
			});
		},
		_selectIndex_handler: function(jEv) {
			var jEl = $(jEv.target).closest(".queryFilter-index");
			jEl.toggleClass("selected");
			this.query.setIndex(jEl.text(), jEl.hasClass("selected"));
			console.log("has set index", this.query.indices);
			var types = this.metadata.getTypes(this.query.indices);
			console.log("final types", types);
		},
		_main_template: function() {
			return { tag: "DIV", id: this.id(), cls: "queryFilter", children: [
				this._aliasSelector_template(),
				this._indexSelector_template(),
				this._typesSelector_template(),
				this._filters_template()
			] };
		},
		_aliasSelector_template: function() {
			var aliases = acx.eachMap(this.metadata.aliases, function(alias) { return alias; } );
			aliases.unshift("All Indices");
			return { tag: "DIV", cls: "section queryFilter-aliases", child:
 				{ tag: "SELECT", onChange: this._selectAlias_handler, children: aliases.map(acx.ut.option_template) }
			}
		},
		_indexSelector_template: function() {
			return { tag: "DIV", cls: "section queryFilter-indices", children: [
				{ tag: "HEADER", text: acx.text("QueryFilter-Header-Indices") },
				{ tag: "DIV", onClick: this._selectIndex_handler, children: acx.eachMap(this.metadata.indices, function(name, data) {
					return { tag: "DIV", cls: "booble queryFilter-index", text: name };
				})}
			] };
		},
		_typesSelector_template: function() {
			return { tag: "DIV", cls: "section queryFilter-types", children: [
				{ tag: "HEADER", text: acx.text("QueryFilter-Header-Types") },
				{ tag: "DIV", children: acx.eachMap(this.metadata.types, function(name, data) {
					return { tag: "DIV", cls: "booble queryFilter-type", text: name };
				})}
			] };
		},
		_filters_template: function() {
			return { tag: "DIV", cls: "section queryFilter-filters", children: [
				{ tag: "HEADER", text: acx.text("QueryFilter-Header-Fields") },
				{ tag: "DIV", children: acx.eachMap(this.metadata.names, function(name, data) {
					return { tag: "LABEL", children: [
						{ tag: "SPAN", text: name },
						{ tag: "SPAN", child: { tag: "INPUT", type: "text" } }
					] };
				} ) }
			] };
		}

	});

	es.ui.Browser = acx.ui.Widget.extend({
		defaults: {
			cluster: null  // (required) instanceof es.Clustger
		},
		init: function() {
			this._super();
			this.cluster = this.config.cluster;
			this.query = new es.Query({ cluster: this.cluster, onResults: function(q) {
				console.log("change", q.indices.join(","), q.types.join(","), q.getData());
			}});
			this.store = new es.QueryDataSourceInterface( { query: this.query } );
			this.el = $(this._main_template());
			new es.MetaDataFactory({
				cluster: this.cluster,
				onReady: function(metadata) {
					console.log("   MetaDataFactory:onReady", metadata);
					this.metadata = metadata;
					this.queryFilter = new es.ui.QueryFilter({ metadata: metadata, query: this.query });
					this.queryFilter.appendTo(this.el.find("> .browser-filter") );
					this.resultTable = new acx.ui.Table( { store: this.store, height: 400, width: this.el.find("> .browser-table").innerWidth() } );
					this.resultTable.appendTo( this.el.find("> .browser-table") );
					this.updateResults();
				}.bind(this)
			})
		},
		updateResults: function() {
			console.log("updateResults");
			this.query.query();
		},
		_main_template: function() {
			return { tag: "DIV", cls: "browser", children: [
				{ tag: "DIV", cls: "browser-filter" },
				{ tag: "DIV", cls: "browser-table" }
			] };
		}
	});



	
	var coretype_map = {
		"string" : "string",
		"long" : "number",
		"integer" : "number",
		"float" : "number",
		"double" : "number",
		"ip" : "number",
		"date" : "date",
		"boolean" : "boolean",
		"binary" : "binary"
	};
	var default_property_map = {
		"string" : { "store" : "no", "index" : "analysed" },
		"number" : { "store" : "no", "precision_steps" : 4 },
		"date" : { "store" : "no", "format" : "dateOptionalTime", "index": "yes", "precision_steps": 4 },
		"boolean" : { "store" : "no", "index": "yes" },
		"binary" : { }
	};

	es.JsonPretty = acx.ui.Widget.extend({
		defaults: {
			obj: null
		},
		init: function(parent) {
			this._super();
			this.el = $(this._main_template());
			this.appendTo(parent);
			this.el.click(this._click_handler);
		},
		
		_click_handler: function(jEv) {
			var t = $(jEv.target).closest(".jsonPretty-name").closest("LI");
			if(t.length === 0 || t.parents(".jsonPretty-minimised").length > 0) { return; }
			t.toggleClass("jsonPretty-minimised");
		},
		
		_main_template: function() {
			try {
					return { tag: "DIV", cls: "jsonPretty", children: this.pretty.parse(this.config.obj) };
			}	catch (error) {
					throw "JsonPretty error: " + error.message;
			}
		},
		
		pretty: { // from https://github.com/RyanAmos/Pretty-JSON/blob/master/pretty_json.js
			"expando" : function(value) {
				return (value && (/array|object/i).test(value.constructor.name)) ? "expando" : "";
			},
			"parse": function (member) {
				return this[(member == undefined) ? 'null' : member.constructor.name.toLowerCase()](member);
			},
			"null": function (value) {
				return this['value']('null', 'null');
			},
			"array": function (value) {
				var results = value.map(function(v) {
					return { tag: "LI", cls: this.expando(v), child: this['parse'](v) };
				}, this);
				return [ "[ ", ((results.length > 0) ? { tag: "UL", cls: "jsonPretty-array", children: results } : null), "]" ];
			},
			"object": function (value) {
				var results = [];
				for (member in value) {
					results.push({ tag: "LI", cls: this.expando(value[member]), children:  [ this['value']('name', member), ': ', this['parse'](value[member]) ] });
				}
				return [ "{ ", ((results.length > 0) ? { tag: "UL", cls: "jsonPretty-object", children: results } : null ),  "}" ];
			},
			"number": function (value) {
				return this['value']('number', value.toString());
			},
			"string": function (value) {
				return this['value']('string', value.toString());
			},
			"boolean": function (value) {
				return this['value']('boolean', value.toString());
			},
			"value": function (type, value) {
				if (/^(http|https):\/\/[^\s]+$/.test(value)) {
					return this['value'](type, { tag: "A", href: value, target: "_blank", text: value } );
				}
				return { tag: "SPAN", cls: "jsonPretty-" + type, text: value };
			}
		}
	});

	es.TableResults = acx.ui.Widget.extend({
		defaults: {
			results: null // elastic search results object
		},
		init: function(parent) {
			this._super();
			this.config.results && this.setResults(this.config.results);
			this.table = new acx.ui.Table(parent, {store: this.store, height: 300, width: $(parent).innerWidth()});
			this.el = this.table.el;
			this.appendTo(parent);
		},
		appendTo: function(parent) {
			this.table.appendTo(parent);
		},
		setResults: function(res) {
			var columns = (function(path, spec, headers) {
				for(var prop in spec) {
					acx.isObject(spec[prop]) ? arguments.callee(path.concat(prop), spec[prop], headers) : headers.push({ name: prop, path: path.concat(prop)});
				}
				return headers;
			})([], res.hits.hits[0], []);

			// create a temporary anonymous DataSource (will fix this up later - DataSourceInterface needs to become async)
			this.store = new (acx.data.DataSourceInterface.extend({
				getCount: function() { return res.hits.total; },
				getColumns: function() { return columns; },
				getData: function() {
					return res.hits.hits.map(function(hit) {
						return columns.reduce(function(row, column) {
							try { 
								var val = column.path.reduce(function(e, h) { return e[h]; }, hit).toString();
							} catch(e) { }
							row[column.name] = val || "";
							return row;
						}, {});
					});
				}
			}))();
			this.table && this.table.setResults(this.store);
		}
	});
	
	es.BoolQuery = acx.ux.Observable.extend({
		defaults: {
			size: 50		// size of pages to return
		},
		init: function() {
			this._super();
			this.refuid = 0;
			this.refmap = {};
			this.search = {
				query: { bool: { must: [], must_not: [], should: [] } },
				from: 0,
				size: this.config.size,
				sort: [],
				facets: {}
			};
			this.defaultClause = this.addClause();
		},
		setPage: function(page) {
			this.search.from = this.config.size * (page - 1) + 1;
		},
		addClause: function(value, field, op, bool) {
			bool = bool || "should";
			op = op || "match_all";
			field = field || "_all";
			var clause = this._setClause(value, field, op, bool);
			var uqid = "q-" + this.refuid++;
			this.refmap[uqid] = { clause: clause, value: value, field: field, op: op, bool: bool };
			if(this.search.query.bool.must.length + this.search.query.bool.should.length > 1) {
				this.removeClause(this.defaultClause);
			}
			this.fire("queryChanged", this, { uqid: uqid, search: this.search} );
			return uqid; // returns reference to inner query object to allow fast updating
		},
		removeClause: function(uqid) {
			var ref = this.refmap[uqid],
				bool = this.search.query.bool[ref.bool];
			bool.splice(bool.indexOf(ref.clause), 1);
		},
		_setClause: function(value, field, op, bool) {
			var clause = {}, query = {};
			if(op === "match_all") {
			} else if(op === "query_string") {
				query["default_field"] = field;
				query["query"] = value;
			} else {
				query[field] = value;
			}
			clause[op] = query;
			this.search.query.bool[bool].push(clause);
			return clause;
		},
		getData: function() {
			return JSON.stringify(this.search);
		}
	});

	es.ElasticSearchHead = acx.ui.Widget.extend({
		defaults: {
			base_uri: "http://localhost:9200/"   // the default ElasticSearch host
		},
		init: function(parent) {
			this._super();
			this.base_uri = localStorage["base_uri"] || this.config.base_uri;
			this._initElements(parent);
		},
		
		open: function(widget, jEv) {
			var t = $(jEv.target).closest("DIV.es-header-menu-item").addClass("active").siblings().removeClass("active");
			this.el.find("#"+this.id("body")).empty().append(widget);
		},
		
		_openAnyQuery_handler: function(jEv) { this.open(new es.AnyQuery({ base_uri: this.base_uri }), jEv);  },
		_openStructuredQuery_handler: function(jEv) { this.open(new es.StructuredQuery({ base_uri: this.base_uri }), jEv);  },
		_openBrowser_handler: function(jEv) { this.open(new es.Browser({ base_uri: this.base_uri }), jEv);  },
		_openClusterHealth_handler: function(jEv) { this.open(new es.SimpleGetQuery({ base_uri: this.base_uri, path: "_cluster/health" }), jEv); },
		_openClusterState_handler: function(jEv) { this.open(new es.SimpleGetQuery({ base_uri: this.base_uri, path: "_cluster/state" }), jEv); },
		_openClusterNodes_handler: function(jEv) { this.open(new es.SimpleGetQuery({ base_uri: this.base_uri, path: "_cluster/nodes" }), jEv); },
		_openClusterNodesStats_handler: function(jEv) { this.open(new es.SimpleGetQuery({ base_uri: this.base_uri, path: "_cluster/nodes/stats" }), jEv); },
		_openStatus_handler: function(jEv) { this.open(new es.SimpleGetQuery({ base_uri: this.base_uri, path: "_status" }), jEv); },
		_openInfo_handler: function(jEv) { this.open(new es.SimpleGetQuery({ base_uri: this.base_uri, path: "" }), jEv); },
		
		_initElements: function(parent) {
			this.el = $(this._main_template());
			this.appendTo(parent);
		},

		_main_template: function() {
			return { tag: "DIV", cls: "es", children: [
				{ tag: "DIV", id: this.id("header"), cls: "es-header", children: [
					{ tag: "DIV", cls: "es-header-top", children: [
						new es.ClusterConnect({ base_uri: this.base_uri, onStatus: this._status_handler, onReconnect: this._reconnect_handler }),
						{ tag: "H1", text: "ElasticSearch" }
					]},
					{ tag: "DIV", cls: "es-header-menu", children: [
						{ tag: "DIV", cls: "es-header-menu-item es-left", text: "Browser", onclick: this._openBrowser_handler },
						{ tag: "DIV", cls: "es-header-menu-item es-left", text: "Structured Query", onclick: this._openStructuredQuery_handler },
						{ tag: "DIV", cls: "es-header-menu-item es-left", text: "Any Request", onclick: this._openAnyQuery_handler },
						{ tag: "DIV", cls: "es-header-menu-item es-right", text: "Cluster Health", onclick: this._openClusterHealth_handler },
						{ tag: "DIV", cls: "es-header-menu-item es-right", text: "Cluster State", onclick: this._openClusterState_handler },
						{ tag: "DIV", cls: "es-header-menu-item es-right", text: "Cluster Nodes", onclick: this._openClusterNodes_handler },
						{ tag: "DIV", cls: "es-header-menu-item es-right", text: "Nodes Stats", onclick: this._openClusterNodesStats_handler },
						{ tag: "DIV", cls: "es-header-menu-item es-right", text: "Status", onclick: this._openStatus_handler },
						{ tag: "DIV", cls: "es-header-menu-item es-right", text: "Info", onclick: this._openInfo_handler }
					]}
				]},
				{ tag: "DIV", id: this.id("body") }
			]};
		},
		
		_status_handler: function(status) {
			this.el.find(".es-header-menu-item:last").click();
		},
		_reconnect_handler: function(base_uri) {
			localStorage["base_uri"] = base_uri;
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
				error: function(xhr, type, message) {
					this.success({ "XHR Error": type, "message": message });
				}
			}, params));
		}
	});
	
	es.ClusterConnect = es.AbstractQuery.extend({
		
		init: function(parent) {
			this._super();
			this.el = $(this._main_template());
			this.appendTo(parent);
			this.nameEl = this.el.find(".es-header-clusterName");
			this.statEl = this.el.find(".es-header-clusterStatus");
			this.statEl.text("cluster health: not connected").css("background", "red");
			this._request_handler({ type: "GET", path: "", success: this._node_handler });
			this._request_handler({	type: "GET", path: "_cluster/health", success: this._health_handler });
		},
		
		_node_handler: function(data) {
			this.nameEl.text(data.name);
		},
		
		_health_handler: function(data) {
			this.statEl.text("cluster health: " + data.status + " (" + data.number_of_nodes + ", " + data.active_primary_shards + ")").css("background", data.status);
			if(data.status === 'green' || data.status === 'yellow') {
				this.fire("status", data.status);
			}
		},
		
		_reconnect_handler: function() {
			var base_uri = this.el.find(".es-header-uri").val();
			this.fire("reconnect", base_uri);
			$("body").empty().append(new es.ElasticSearchHead("body", { id: "es", base_uri: base_uri }));
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
			default_path: "_search",
			default_query: { query: { match_all: { }}}
		},
		init: function(parent) {
			this._super();
			this.el = $(this._main_template());
			this.appendTo(parent);
		},

		_request_handler: function() {
			this.el.find("DIV.es-out").text("searching...");
			this._super({
				url: this.el.find("#q-url").val(),
				type: this.el.find("#q-method").val(),
				data: this.el.find("#q-body").val().trim(),
				success: this._responseWriter_handler
			});
		},
		
		_responseWriter_handler: function(data) {
			this.el.find("DIV.es-out").empty().append(new es.JsonPretty({ obj: data }));
		},
		
		_main_template: function() {
			return { tag: "DIV", children: [
				{ tag: "DIV", cls: "es-conf", children: [
					{ tag: "INPUT", type: "text", id: "q-url", value: this.config.base_uri + this.config.default_path },
					{ tag: "SELECT", id: "q-method", children: ["POST", "GET", "PUT", "DELETE"].map(acx.ut.option_template) },
					{ tag: "BUTTON", type: "button", text: "Go", onclick: this._request_handler },
					{ tag: "BR" },
					{ tag: "TEXTAREA", id: "q-body", rows: 10, cols: 80, text: JSON.stringify(this.config.default_query) }
				] },
				{ tag: "DIV", cls: "es-out" }
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
					this.el.empty().append(new es.JsonPretty({ obj: data }));
				}.bind(this)
			});
		},

		_main_template: function() {
			return { tag: "DIV", cls: "es-out" };
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
			this.out = this.el.find("DIV.es-out");
			this.appendTo(parent);
		},
		
		_indexChanged_handler: function(index) {
			this.filter && this.filter.remove();
			this.filter = new es.FilterBrowser({
				base_uri: this.config.base_uri,
				index: index,
				onStaringSearch: function() { this.el.find("DIV.es-out").text("Searching..."); this.el.find("DIV.es-searchSource").hide(); }.bind(this),
				onSearchSource: this._searchSource_handler,
				onJsonResults: this._jsonResults_handler,
				onTableResults: this._tableResults_handler
			});
			this.el.find(".es-structuredQuery-body").append(this.filter);
		},
		
		_jsonResults_handler: function(results) {
			this.el.find("DIV.es-out").empty().append(new es.JsonPretty({ obj: results }));
		},
		
		_tableResults_handler: function(results) {
			new es.TableResults(this.out.empty(), { results: results });
		},
		
		_searchSource_handler: function(src) {
			this.el.find("DIV.es-searchSource").empty().append(new es.JsonPretty({ obj: src })).show();
		},
		
		_main_template: function() {
			return { tag: "DIV", children: [
				this.selector,
				{ tag: "DIV", cls: "es-structuredQuery-body" },
				{ tag: "DIV", cls: "es-searchSource", css: { display: "none" } },
				{ tag: "DIV", cls: "es-out" }
			]};
		}
	});
	
	es.FilterBrowser = es.AbstractQuery.extend({
		defaults: {
			index: "" // (required) name of the index to query
		},

		init: function(parent) {
			this._super();
			this.el = $(this._main_template());
			this.filtersEl = this.el.find(".es-filterBrowser-filters");
			this.appendTo(parent);
			this._request_handler({ type: "GET", path: this.config.index + "/_mapping", success: this._createFilters_handler });
		},

		_createFilters_handler: function(data) {
			var filters = this.filters = [ { path: ["match_all"], type: "match_all", meta: {} }, { path: ["_all"], type: "_all", meta: {}} ];
			function scan_properties(path, obj) {
				if(obj.properties) {
					for(var prop in obj.properties) {
						scan_properties(path.concat(prop), obj.properties[prop]);
					}
				} else {
					filters.push( { path: path, type: obj.type, meta: obj } );
				}
			}
			for(var type in data[this.config.index]) {
				scan_properties([type], data[this.config.index][type]);
			}
			this._addFilterRow_handler();
		},
		
		_addFilterRow_handler: function() {
			this.filtersEl.append(this._filter_template());
		},
		
		_removeFilterRow_handler: function(jEv) {
			$(jEv.target).closest("DIV.es-filterBrowser-row").remove();
			if(this.filtersEl.children().length === 0) {
				this._addFilterRow_handler();
			}
		},
		
		_search_handler: function() {
			var search = new es.BoolQuery();
			this.fire("staringSearch");
			this.filtersEl.find(".es-filterBrowser-row").each(function(i, row) {
				var row = $(row);
				var bool = row.find(".es-bool").val();
				var field = row.find(".es-field").val();
				var op = row.find(".es-op").val();
				var value = {};
				if(field === "match_all") {
					op = "match_all";
				} else if(op === "range") {
					var lowqual = row.find(".es-lowqual").val(),
						highqual = row.find(".es-highqual").val();
					if(lowqual.length) value[row.find(".es-lowop").val()] = lowqual;
					if(highqual.length) value[row.find(".es-highop").val()] = highqual;
				} else {
					value = row.find(".es-qual").val();
				}
				search.addClause(value, field, op, bool);
			});
			if(this.el.find(".es-filterBrowser-showSrc").attr("checked")) {
				this.fire("searchSource", search.search);
			}
			this._request_handler({
				path: this.config.index + "/_search",
				data: search.getData(),
				success: this._results_handler
			});
		},
		
		_results_handler: function(data) {
			if(this.el.find(".es-filterBrowser-outputFormat").val() === "Table") {
				this.fire("tableResults", data);
			} else {
				this.fire("jsonResults", data);
			}
		},
		
		_changeQueryField_handler: function(jEv) {
			var select = $(jEv.target);
			var spec = select.children(":selected").data("spec");
			select.siblings().remove(".es-op,.es-qual,.es-range");
			var ops = [];
			if(spec.type === 'match_all') {
			} else if(spec.type === '_all') {
				ops = ["query_string"];
			} else if(spec.type === 'string') {
				ops = ["term", "wildcard", "prefix", "fuzzy", "range", "query_string"];
			} else if(spec.type === 'number') {
				ops = ["range"];
			} else if(spec.type === 'date') {
				ops = ["range"];
			}
			select.after({ tag: "SELECT", cls: "es-op", onchange: this._changeQueryOp_handler, children: ops.map(acx.ut.option_template) });
			select.next().change();
		},
		
		_changeQueryOp_handler: function(jEv) {
			var op = $(jEv.target), opv = op.val();
			op.siblings().remove(".es-qual,.es-range");
			if(opv === 'term' || opv === 'wildcard' || opv === 'prefix' || opv === 'fuzzy' || opv === "query_string") {
				op.after({ tag: "INPUT", cls: "es-qual", type: "text" })
			} else if(opv === 'range') {
				op.after(this._range_template());
			}
		},
		
		_main_template: function() {
			return { tag: "DIV", children: [
				{ tag: "DIV", cls: "es-filterBrowser-filters" },
				{ tag: "BUTTON", type: "button", text: "Search", onclick: this._search_handler },
				{ tag: "LABEL", children: [
					"Output Results: ",
					{ tag: "SELECT", cls: "es-filterBrowser-outputFormat", children: ["Table", "JSON"].map(acx.ut.option_template) }
				]},
				{ tag: "LABEL", children: [ { tag: "INPUT", type: "checkbox", cls: "es-filterBrowser-showSrc" }, "Show query source" ] }
			]}
		},
		
		_filter_template: function() {
			return { tag: "DIV", cls: "es-filterBrowser-row", children: [
				{ tag: "SELECT", cls: "es-bool", children: ["must", "must_not", "should"].map(acx.ut.option_template) },
				{ tag: "SELECT", cls: "es-field", onchange: this._changeQueryField_handler, children: this.filters.map(function(f) {
					return { tag: "OPTION", data: { spec: f }, value: f.path[f.path.length-1], text: f.path.join(".") };
				})},
				{ tag: "BUTTON", type: "button", text: "+", onclick: this._addFilterRow_handler },
				{ tag: "BUTTON", type: "button", text: "-", onclick: this._removeFilterRow_handler }
			]};
		},
		
		_range_template: function() {
			return { tag: "SPAN", cls: "es-range", children: [
				{ tag: "SELECT", cls: "es-lowop", children: ["from", "gt", "gte"].map(acx.ut.option_template) },
				{ tag: "INPUT", type: "text", cls: "es-lowqual" },
				{ tag: "SELECT", cls: "es-highop", children: ["to", "lt", "lte"].map(acx.ut.option_template) },
				{ tag: "INPUT", type: "text", cls: "es-highqual" },
			]};
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
			var options = [];
			for(var name in data.indices) { options.push(this._option_template(name, data.indices[name])); }
			this.el.find(".es-indexSelector-select").empty().append(this._select_template(options));
			this._indexChanged_handler();
		},
		
		_main_template: function() {
			return { tag: "DIV", cls: "es-indexSelector", children: [ 
				"Search ",
				{ tag: "SPAN", cls: "es-indexSelector-select" },
				" for documents where:"
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
	
	es.Browser = es.AbstractQuery.extend({
		init: function(parent) {
			this._super();
			this.resultTable = null; //new es.TableResults();
			this.el = $(this._main_template());
			this.appendTo(parent);
			this.readMetaData();
		},
		readMetaData: function() {
			this._request_handler({
				path: "_cluster/state",
				type: "GET",
				success: this._clusterState_handler
			});
		},
		setResults: function(res) {
			if(res !== null) {
				if(!this.resultTable) {
					this.resultTable = new es.TableResults(this.el.find(".es-browserTable"), {});
				}
				this.resultTable.setResults(res);
			}
		},
		_clusterState_handler: function(state) {
			function createMapping(prop, n) {
				return acx.extend( { index_name: n, core_type: coretype_map[prop.type] }, default_property_map[coretype_map[prop.type]], prop );
			}
			function getMetaData(prop, tmeta, imeta) {
				for(var n in prop) {
					"properties" in prop[n] ? getMetaData(prop[n].properties, tmeta, imeta) : tmeta[n] = imeta[n] = createMapping(prop[n], n);
				}
			}
			var indices = this.indices = {};
			for(var index in state.metadata.indices) {
				indices[index] = { scanned: false, types: {}, metadata: {} };
				for(var type in state.metadata.indices[index].mappings) {
					indices[index].types[type] = { selected: false, metadata: {} };
					getMetaData(state.metadata.indices[index].mappings[type].properties, indices[index].types[type].metadata, indices[index].metadata);
				}
			}
			this.el.find(".es-browserFilter").empty().append(this._browserFilter_template());
			this.el.find(".es-filterBrowserIndexSelector").change();
		},
		_indexSelector_handler: function(jEv) {
			var indexName = $(jEv.target).val(),
				index = this.indices[indexName];
			if(! index.scanned) {
				var req = { size: 0, query: { match_all: {} }, facets: {} };
				acx.each(index.metadata, function(field, info) {
					switch(info.core_type) {
						case "string" :
//							req.facets[field + "_stat"] = {"terms":{"field":field,"size":50}}; break; DISBALED (performance reasons)
							break;
						case "date" : case "number" :
							req.facets[field + "_stat"] = {"statistical":{"field":field}}; break;
					}
				});
				this._request_handler({
					path: indexName + "/_search",
					data: JSON.stringify(req),
					success: function(facets) {
						index.scanned = true;
						facets.facets && acx.each(facets.facets, function(n, facet) { index.metadata[facet._field].stats = facet; });
						this._buildFilters(index);
					}.bind(this)
				});
			} else {
				this._buildFilters(index);
			}
		},
		_buildFilters: function(index) {
			this.el.find(".es-filterBrowserTypeFilter").empty().append(this._typeFilters_template(index));
			this.el.find(".es-filterBrowserMetaFilter").empty().append(this._metaFilters_template(index));
			this.el.find(".es-filterBrowserType:first").click();
		},
		_selectType_handler: function(jEv) {
			var typeEl = $(jEv.target).closest("DIV.es-filterBrowserType").toggleClass("es-selected");
			this._filterChange_handler();
		},
		_filterChange_handler: function() {
			var search = new es.BoolQuery(),
				index = null,
				types = [];
			this.el.find(".es-filter").each(function(i, el) {
				var jEl = $(el), filter = jEl.data("filterKey");
				if(filter === "_index") {
					index = jEl.val();
				} else if(filter === "_type" && jEl.hasClass("es-selected")) {
					types.push(jEl.text());
				} else {
					var meta = jEl.data("meta"), val = jEl.val();
					if(val.length) {
						if(meta.core_type === "string") {
							if(jEl[0] === document.activeElement && jEl[0].selectionStart === jEl[0].selectionEnd) {
								val = val.replace(new RegExp("(.{"+jEl[0].selectionStart+"})"), "$&*");
							}
							val.split(/\s+/).forEach(function(term) {
								if(term) {
									search.addClause(term, meta.index_name, "wildcard", "must");
								}
							});
						} else if(meta.core_type === "boolean") {
							if(val !== "-select-") {
								search.addClause(val, meta.index_name, "term", "must");
							}
						}
					}
				}
			});
			this._request_handler({
				path: index + "/" + types.join(",") + (types.length ? "/" : "") + "_search",
				data: search.getData(),
				success: function(res) {
					this.setResults(res);
				}.bind(this)
			});
		},

		_main_template: function() {
			return { tag: "DIV", cls: "es-browser", children: [
				{ tag: "DIV", cls: "es-browserFilter" },
				{ tag: "DIV", cls: "es-browserTable" }
			] };
		},
		_browserFilter_template: function() {
			return { tag: "DIV", children: [
				{ tag: "DIV", cls: "es-title", text: "Index" },
				{ tag: "SELECT", cls: "es-filterBrowserIndexSelector es-filter", data: { filterKey: "_index" }, onchange: this._indexSelector_handler, children: acx.eachMap(this.indices, acx.ut.option_template) },
				{ tag: "DIV", cls: "es-title", text: "Types" },
				{ tag: "DIV", cls: "es-filterBrowserTypeFilter" },
				{ tag: "DIV", cls: "es-title", text: "Metadata" },
				{ tag: "DIV", cls: "es-filterBrowserMetaFilter" },
				{ tag: "DIV", cls: "es-out" }
			]};
		},
		_typeFilters_template: function(index) {
			return { tag: "DIV", onclick: this._selectType_handler, children: acx.eachMap(index.types, function(type) {
				return { tag: "DIV", data: { filterKey: "_type" }, cls: "es-filterBrowserType es-filter", text: type};
			})};
		},
		_metaFilters_template: function(index) {
			console.log("_metaFilters_template");
			return { tag: "DIV", children: acx.eachMap(index.metadata, function(field, meta) {
				return { tag: "DIV", children: [
					field,
					this._metaFilter_templates[meta.core_type](meta, this._filterChange_handler)
				]};
			}, this)};
		},
		_metaFilter_templates: {
			"boolean" : function(meta, onChange) {
				return { tag: "SELECT", cls: "es-filter", onchange: onChange, data: { filterKey: meta.index_name, meta: meta}, children: ["-select-","true","false"].map(acx.ut.option_template) };
			},
			"number" : function(meta, onChange) {
			},
			"string" : function(meta, onChange) {
				return { tag: "INPUT", onkeyup: onChange, type: "text", data: { filterKey: meta.index_name, meta: meta }, cls: "es-filter" };
			},
			"date" : function(meta, onChange) {
				return null; // for later :)
				var range = [
					{ text: "minute", value: (1000 * 60) },
					{ text: "hour", value: (1000 * 60 * 60) },
					{ text: "day", value: (1000 * 60 * 60 * 24) },
					{ text: "week", value: (1000 * 60 * 60 * 24 * 7), selected: true },
					{ text: "month", value: (1000 * 60 * 60 * 24 * 31) },
					{ text: "year", value: (1000 * 60 * 60 * 24 * 365) } ];
				return { tag: "SPAN", children: [
					"Within the",
					{ tag: "SELECT", onchange: onChange, data: { filterKey: meta.index_name, meta: meta }, cls: "es-filter", children: range.map(function(r) {
						return acx.extend({ tag: "OPTION" }, r);
					}) }
				]};
			}
		}
	});
})();













