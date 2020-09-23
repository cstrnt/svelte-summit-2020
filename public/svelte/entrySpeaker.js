System.register([], function (exports) {
    'use strict';
    return {
        execute: function () {

            function noop() { }
            function add_location(element, file, line, column, char) {
                element.__svelte_meta = {
                    loc: { file, line, column, char }
                };
            }
            function run(fn) {
                return fn();
            }
            function blank_object() {
                return Object.create(null);
            }
            function run_all(fns) {
                fns.forEach(run);
            }
            function is_function(thing) {
                return typeof thing === 'function';
            }
            function not_equal(a, b) {
                return a != a ? b == b : a !== b;
            }

            function append(target, node) {
                target.appendChild(node);
            }
            function insert(target, node, anchor) {
                target.insertBefore(node, anchor || null);
            }
            function detach(node) {
                node.parentNode.removeChild(node);
            }
            function element(name) {
                return document.createElement(name);
            }
            function svg_element(name) {
                return document.createElementNS('http://www.w3.org/2000/svg', name);
            }
            function text(data) {
                return document.createTextNode(data);
            }
            function space() {
                return text(' ');
            }
            function attr(node, attribute, value) {
                if (value == null)
                    node.removeAttribute(attribute);
                else if (node.getAttribute(attribute) !== value)
                    node.setAttribute(attribute, value);
            }
            function children(element) {
                return Array.from(element.childNodes);
            }
            function claim_element(nodes, name, attributes, svg) {
                for (let i = 0; i < nodes.length; i += 1) {
                    const node = nodes[i];
                    if (node.nodeName === name) {
                        let j = 0;
                        const remove = [];
                        while (j < node.attributes.length) {
                            const attribute = node.attributes[j++];
                            if (!attributes[attribute.name]) {
                                remove.push(attribute.name);
                            }
                        }
                        for (let k = 0; k < remove.length; k++) {
                            node.removeAttribute(remove[k]);
                        }
                        return nodes.splice(i, 1)[0];
                    }
                }
                return svg ? svg_element(name) : element(name);
            }
            function claim_text(nodes, data) {
                for (let i = 0; i < nodes.length; i += 1) {
                    const node = nodes[i];
                    if (node.nodeType === 3) {
                        node.data = '' + data;
                        return nodes.splice(i, 1)[0];
                    }
                }
                return text(data);
            }
            function claim_space(nodes) {
                return claim_text(nodes, ' ');
            }
            function custom_event(type, detail) {
                const e = document.createEvent('CustomEvent');
                e.initCustomEvent(type, false, false, detail);
                return e;
            }
            class HtmlTag {
                constructor(anchor = null) {
                    this.a = anchor;
                    this.e = this.n = null;
                }
                m(html, target, anchor = null) {
                    if (!this.e) {
                        this.e = element(target.nodeName);
                        this.t = target;
                        this.h(html);
                    }
                    this.i(anchor);
                }
                h(html) {
                    this.e.innerHTML = html;
                    this.n = Array.from(this.e.childNodes);
                }
                i(anchor) {
                    for (let i = 0; i < this.n.length; i += 1) {
                        insert(this.t, this.n[i], anchor);
                    }
                }
                p(html) {
                    this.d();
                    this.h(html);
                    this.i(this.a);
                }
                d() {
                    this.n.forEach(detach);
                }
            }

            let current_component;
            function set_current_component(component) {
                current_component = component;
            }

            const dirty_components = [];
            const binding_callbacks = [];
            const render_callbacks = [];
            const flush_callbacks = [];
            const resolved_promise = Promise.resolve();
            let update_scheduled = false;
            function schedule_update() {
                if (!update_scheduled) {
                    update_scheduled = true;
                    resolved_promise.then(flush);
                }
            }
            function add_render_callback(fn) {
                render_callbacks.push(fn);
            }
            let flushing = false;
            const seen_callbacks = new Set();
            function flush() {
                if (flushing)
                    return;
                flushing = true;
                do {
                    // first, call beforeUpdate functions
                    // and update components
                    for (let i = 0; i < dirty_components.length; i += 1) {
                        const component = dirty_components[i];
                        set_current_component(component);
                        update(component.$$);
                    }
                    dirty_components.length = 0;
                    while (binding_callbacks.length)
                        binding_callbacks.pop()();
                    // then, once components are updated, call
                    // afterUpdate functions. This may cause
                    // subsequent updates...
                    for (let i = 0; i < render_callbacks.length; i += 1) {
                        const callback = render_callbacks[i];
                        if (!seen_callbacks.has(callback)) {
                            // ...so guard against infinite loops
                            seen_callbacks.add(callback);
                            callback();
                        }
                    }
                    render_callbacks.length = 0;
                } while (dirty_components.length);
                while (flush_callbacks.length) {
                    flush_callbacks.pop()();
                }
                update_scheduled = false;
                flushing = false;
                seen_callbacks.clear();
            }
            function update($$) {
                if ($$.fragment !== null) {
                    $$.update();
                    run_all($$.before_update);
                    const dirty = $$.dirty;
                    $$.dirty = [-1];
                    $$.fragment && $$.fragment.p($$.ctx, dirty);
                    $$.after_update.forEach(add_render_callback);
                }
            }
            const outroing = new Set();
            function transition_in(block, local) {
                if (block && block.i) {
                    outroing.delete(block);
                    block.i(local);
                }
            }
            function mount_component(component, target, anchor) {
                const { fragment, on_mount, on_destroy, after_update } = component.$$;
                fragment && fragment.m(target, anchor);
                // onMount happens before the initial afterUpdate
                add_render_callback(() => {
                    const new_on_destroy = on_mount.map(run).filter(is_function);
                    if (on_destroy) {
                        on_destroy.push(...new_on_destroy);
                    }
                    else {
                        // Edge case - component was destroyed immediately,
                        // most likely as a result of a binding initialising
                        run_all(new_on_destroy);
                    }
                    component.$$.on_mount = [];
                });
                after_update.forEach(add_render_callback);
            }
            function destroy_component(component, detaching) {
                const $$ = component.$$;
                if ($$.fragment !== null) {
                    run_all($$.on_destroy);
                    $$.fragment && $$.fragment.d(detaching);
                    // TODO null out other refs, including component.$$ (but need to
                    // preserve final state?)
                    $$.on_destroy = $$.fragment = null;
                    $$.ctx = [];
                }
            }
            function make_dirty(component, i) {
                if (component.$$.dirty[0] === -1) {
                    dirty_components.push(component);
                    schedule_update();
                    component.$$.dirty.fill(0);
                }
                component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
            }
            function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
                const parent_component = current_component;
                set_current_component(component);
                const prop_values = options.props || {};
                const $$ = component.$$ = {
                    fragment: null,
                    ctx: null,
                    // state
                    props,
                    update: noop,
                    not_equal,
                    bound: blank_object(),
                    // lifecycle
                    on_mount: [],
                    on_destroy: [],
                    before_update: [],
                    after_update: [],
                    context: new Map(parent_component ? parent_component.$$.context : []),
                    // everything else
                    callbacks: blank_object(),
                    dirty
                };
                let ready = false;
                $$.ctx = instance
                    ? instance(component, prop_values, (i, ret, ...rest) => {
                        const value = rest.length ? rest[0] : ret;
                        if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                            if ($$.bound[i])
                                $$.bound[i](value);
                            if (ready)
                                make_dirty(component, i);
                        }
                        return ret;
                    })
                    : [];
                $$.update();
                ready = true;
                run_all($$.before_update);
                // `false` as a special case of no DOM component
                $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
                if (options.target) {
                    if (options.hydrate) {
                        const nodes = children(options.target);
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        $$.fragment && $$.fragment.l(nodes);
                        nodes.forEach(detach);
                    }
                    else {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        $$.fragment && $$.fragment.c();
                    }
                    if (options.intro)
                        transition_in(component.$$.fragment);
                    mount_component(component, options.target, options.anchor);
                    flush();
                }
                set_current_component(parent_component);
            }
            class SvelteComponent {
                $destroy() {
                    destroy_component(this, 1);
                    this.$destroy = noop;
                }
                $on(type, callback) {
                    const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                    callbacks.push(callback);
                    return () => {
                        const index = callbacks.indexOf(callback);
                        if (index !== -1)
                            callbacks.splice(index, 1);
                    };
                }
                $set() {
                    // overridden by instance, if it has props
                }
            }

            function dispatch_dev(type, detail) {
                document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
            }
            function append_dev(target, node) {
                dispatch_dev("SvelteDOMInsert", { target, node });
                append(target, node);
            }
            function insert_dev(target, node, anchor) {
                dispatch_dev("SvelteDOMInsert", { target, node, anchor });
                insert(target, node, anchor);
            }
            function detach_dev(node) {
                dispatch_dev("SvelteDOMRemove", { node });
                detach(node);
            }
            function attr_dev(node, attribute, value) {
                attr(node, attribute, value);
                if (value == null)
                    dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
                else
                    dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
            }
            function validate_slots(name, slot, keys) {
                for (const slot_key of Object.keys(slot)) {
                    if (!~keys.indexOf(slot_key)) {
                        console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
                    }
                }
            }
            class SvelteComponentDev extends SvelteComponent {
                constructor(options) {
                    if (!options || (!options.target && !options.$$inline)) {
                        throw new Error(`'target' is a required option`);
                    }
                    super();
                }
                $destroy() {
                    super.$destroy();
                    this.$destroy = () => {
                        console.warn(`Component was already destroyed`); // eslint-disable-line no-console
                    };
                }
                $capture_state() { }
                $inject_state() { }
            }

            /* src/components/Speaker.svelte generated by Svelte v3.26.0 */

            const file = "src/components/Speaker.svelte";

            // (63:59) {:else}
            function create_else_block(ctx) {
            	let t;

            	const block = {
            		c: function create() {
            			t = text(/*title*/ ctx[3]);
            		},
            		l: function claim(nodes) {
            			t = claim_text(nodes, /*title*/ ctx[3]);
            		},
            		m: function mount(target, anchor) {
            			insert_dev(target, t, anchor);
            		},
            		p: noop,
            		d: function destroy(detaching) {
            			if (detaching) detach_dev(t);
            		}
            	};

            	dispatch_dev("SvelteRegisterBlock", {
            		block,
            		id: create_else_block.name,
            		type: "else",
            		source: "(63:59) {:else}",
            		ctx
            	});

            	return block;
            }

            // (63:6) {#if link}
            function create_if_block(ctx) {
            	let a;
            	let t;
            	let a_href_value;

            	const block = {
            		c: function create() {
            			a = element("a");
            			t = text(/*title*/ ctx[3]);
            			this.h();
            		},
            		l: function claim(nodes) {
            			a = claim_element(nodes, "A", { href: true, class: true });
            			var a_nodes = children(a);
            			t = claim_text(a_nodes, /*title*/ ctx[3]);
            			a_nodes.forEach(detach_dev);
            			this.h();
            		},
            		h: function hydrate() {
            			attr_dev(a, "href", a_href_value = "/talks/" + /*speaker*/ ctx[1].slug);
            			attr_dev(a, "class", "svelte-1sfnb0p");
            			add_location(a, file, 62, 16, 1137);
            		},
            		m: function mount(target, anchor) {
            			insert_dev(target, a, anchor);
            			append_dev(a, t);
            		},
            		p: function update(ctx, dirty) {
            			if (dirty & /*speaker*/ 2 && a_href_value !== (a_href_value = "/talks/" + /*speaker*/ ctx[1].slug)) {
            				attr_dev(a, "href", a_href_value);
            			}
            		},
            		d: function destroy(detaching) {
            			if (detaching) detach_dev(a);
            		}
            	};

            	dispatch_dev("SvelteRegisterBlock", {
            		block,
            		id: create_if_block.name,
            		type: "if",
            		source: "(63:6) {#if link}",
            		ctx
            	});

            	return block;
            }

            function create_fragment(ctx) {
            	let div3;
            	let div0;
            	let img0;
            	let img0_src_value;
            	let t0;
            	let div2;
            	let span;
            	let t1;
            	let t2;
            	let h3;
            	let t3;
            	let html_tag;
            	let raw_value = /*speaker*/ ctx[1].html + "";
            	let t4;
            	let div1;
            	let img1;
            	let img1_src_value;
            	let t5;
            	let a;
            	let t6;

            	function select_block_type(ctx, dirty) {
            		if (/*link*/ ctx[0]) return create_if_block;
            		return create_else_block;
            	}

            	let current_block_type = select_block_type(ctx);
            	let if_block = current_block_type(ctx);

            	const block = {
            		c: function create() {
            			div3 = element("div");
            			div0 = element("div");
            			img0 = element("img");
            			t0 = space();
            			div2 = element("div");
            			span = element("span");
            			t1 = text(/*name*/ ctx[4]);
            			t2 = space();
            			h3 = element("h3");
            			if_block.c();
            			t3 = space();
            			t4 = space();
            			div1 = element("div");
            			img1 = element("img");
            			t5 = space();
            			a = element("a");
            			t6 = text(/*twitterUser*/ ctx[6]);
            			this.h();
            		},
            		l: function claim(nodes) {
            			div3 = claim_element(nodes, "DIV", { class: true });
            			var div3_nodes = children(div3);
            			div0 = claim_element(div3_nodes, "DIV", { class: true });
            			var div0_nodes = children(div0);
            			img0 = claim_element(div0_nodes, "IMG", { src: true, alt: true, class: true });
            			div0_nodes.forEach(detach_dev);
            			t0 = claim_space(div3_nodes);
            			div2 = claim_element(div3_nodes, "DIV", { class: true });
            			var div2_nodes = children(div2);
            			span = claim_element(div2_nodes, "SPAN", { class: true });
            			var span_nodes = children(span);
            			t1 = claim_text(span_nodes, /*name*/ ctx[4]);
            			span_nodes.forEach(detach_dev);
            			t2 = claim_space(div2_nodes);
            			h3 = claim_element(div2_nodes, "H3", { class: true });
            			var h3_nodes = children(h3);
            			if_block.l(h3_nodes);
            			h3_nodes.forEach(detach_dev);
            			t3 = claim_space(div2_nodes);
            			t4 = claim_space(div2_nodes);
            			div1 = claim_element(div2_nodes, "DIV", { class: true });
            			var div1_nodes = children(div1);
            			img1 = claim_element(div1_nodes, "IMG", { src: true, alt: true, class: true });
            			t5 = claim_space(div1_nodes);
            			a = claim_element(div1_nodes, "A", { href: true, class: true });
            			var a_nodes = children(a);
            			t6 = claim_text(a_nodes, /*twitterUser*/ ctx[6]);
            			a_nodes.forEach(detach_dev);
            			div1_nodes.forEach(detach_dev);
            			div2_nodes.forEach(detach_dev);
            			div3_nodes.forEach(detach_dev);
            			this.h();
            		},
            		h: function hydrate() {
            			if (img0.src !== (img0_src_value = "/dist/static/images/speakers/" + /*image*/ ctx[2])) attr_dev(img0, "src", img0_src_value);
            			attr_dev(img0, "alt", "Speaker profile");
            			attr_dev(img0, "class", "svelte-1sfnb0p");
            			add_location(img0, file, 57, 4, 985);
            			attr_dev(div0, "class", "image svelte-1sfnb0p");
            			add_location(div0, file, 56, 2, 961);
            			attr_dev(span, "class", "name svelte-1sfnb0p");
            			add_location(span, file, 60, 4, 1079);
            			attr_dev(h3, "class", "svelte-1sfnb0p");
            			add_location(h3, file, 61, 4, 1116);
            			html_tag = new HtmlTag(t4);
            			if (img1.src !== (img1_src_value = "/dist/static/images/twitter.svg")) attr_dev(img1, "src", img1_src_value);
            			attr_dev(img1, "alt", "Twitter logo");
            			attr_dev(img1, "class", "svelte-1sfnb0p");
            			add_location(img1, file, 66, 6, 1267);
            			attr_dev(a, "href", /*twitter*/ ctx[5]);
            			attr_dev(a, "class", "svelte-1sfnb0p");
            			add_location(a, file, 67, 6, 1338);
            			attr_dev(div1, "class", "twitter svelte-1sfnb0p");
            			add_location(div1, file, 65, 4, 1239);
            			attr_dev(div2, "class", "svelte-1sfnb0p");
            			add_location(div2, file, 59, 2, 1069);
            			attr_dev(div3, "class", "speaker svelte-1sfnb0p");
            			add_location(div3, file, 55, 0, 937);
            		},
            		m: function mount(target, anchor) {
            			insert_dev(target, div3, anchor);
            			append_dev(div3, div0);
            			append_dev(div0, img0);
            			append_dev(div3, t0);
            			append_dev(div3, div2);
            			append_dev(div2, span);
            			append_dev(span, t1);
            			append_dev(div2, t2);
            			append_dev(div2, h3);
            			if_block.m(h3, null);
            			append_dev(div2, t3);
            			html_tag.m(raw_value, div2);
            			append_dev(div2, t4);
            			append_dev(div2, div1);
            			append_dev(div1, img1);
            			append_dev(div1, t5);
            			append_dev(div1, a);
            			append_dev(a, t6);
            		},
            		p: function update(ctx, [dirty]) {
            			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
            				if_block.p(ctx, dirty);
            			} else {
            				if_block.d(1);
            				if_block = current_block_type(ctx);

            				if (if_block) {
            					if_block.c();
            					if_block.m(h3, null);
            				}
            			}

            			if (dirty & /*speaker*/ 2 && raw_value !== (raw_value = /*speaker*/ ctx[1].html + "")) html_tag.p(raw_value);
            		},
            		i: noop,
            		o: noop,
            		d: function destroy(detaching) {
            			if (detaching) detach_dev(div3);
            			if_block.d();
            		}
            	};

            	dispatch_dev("SvelteRegisterBlock", {
            		block,
            		id: create_fragment.name,
            		type: "component",
            		source: "",
            		ctx
            	});

            	return block;
            }

            function instance($$self, $$props, $$invalidate) {
            	let { $$slots: slots = {}, $$scope } = $$props;
            	validate_slots("Speaker", slots, []);
            	let { link = false } = $$props;
            	let { speaker } = $$props;
            	const { image, title, name, twitter, twitterUser } = speaker.frontmatter;
            	const writable_props = ["link", "speaker"];

            	Object.keys($$props).forEach(key => {
            		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Speaker> was created with unknown prop '${key}'`);
            	});

            	$$self.$$set = $$props => {
            		if ("link" in $$props) $$invalidate(0, link = $$props.link);
            		if ("speaker" in $$props) $$invalidate(1, speaker = $$props.speaker);
            	};

            	$$self.$capture_state = () => ({
            		link,
            		speaker,
            		image,
            		title,
            		name,
            		twitter,
            		twitterUser
            	});

            	$$self.$inject_state = $$props => {
            		if ("link" in $$props) $$invalidate(0, link = $$props.link);
            		if ("speaker" in $$props) $$invalidate(1, speaker = $$props.speaker);
            	};

            	if ($$props && "$$inject" in $$props) {
            		$$self.$inject_state($$props.$$inject);
            	}

            	return [link, speaker, image, title, name, twitter, twitterUser];
            }

            class Speaker extends SvelteComponentDev {
            	constructor(options) {
            		super(options);
            		init(this, options, instance, create_fragment, not_equal, { link: 0, speaker: 1 });

            		dispatch_dev("SvelteRegisterComponent", {
            			component: this,
            			tagName: "Speaker",
            			options,
            			id: create_fragment.name
            		});

            		const { ctx } = this.$$;
            		const props = options.props || {};

            		if (/*speaker*/ ctx[1] === undefined && !("speaker" in props)) {
            			console.warn("<Speaker> was created without expected prop 'speaker'");
            		}
            	}

            	get link() {
            		throw new Error("<Speaker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
            	}

            	set link(value) {
            		throw new Error("<Speaker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
            	}

            	get speaker() {
            		throw new Error("<Speaker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
            	}

            	set speaker(value) {
            		throw new Error("<Speaker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
            	}
            } exports('default', Speaker);

        }
    };
});
//# sourceMappingURL=entrySpeaker.js.map
