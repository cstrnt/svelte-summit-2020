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
            function destroy_each(iterations, detaching) {
                for (let i = 0; i < iterations.length; i += 1) {
                    if (iterations[i])
                        iterations[i].d(detaching);
                }
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
            function empty() {
                return text('');
            }
            function listen(node, event, handler, options) {
                node.addEventListener(event, handler, options);
                return () => node.removeEventListener(event, handler, options);
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
            function toggle_class(element, name, toggle) {
                element.classList[toggle ? 'add' : 'remove'](name);
            }
            function custom_event(type, detail) {
                const e = document.createEvent('CustomEvent');
                e.initCustomEvent(type, false, false, detail);
                return e;
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
            function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
                const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
                if (has_prevent_default)
                    modifiers.push('preventDefault');
                if (has_stop_propagation)
                    modifiers.push('stopPropagation');
                dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
                const dispose = listen(node, event, handler, options);
                return () => {
                    dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
                    dispose();
                };
            }
            function attr_dev(node, attribute, value) {
                attr(node, attribute, value);
                if (value == null)
                    dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
                else
                    dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
            }
            function set_data_dev(text, data) {
                data = '' + data;
                if (text.wholeText === data)
                    return;
                dispatch_dev("SvelteDOMSetData", { node: text, data });
                text.data = data;
            }
            function validate_each_argument(arg) {
                if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
                    let msg = '{#each} only iterates over array-like objects.';
                    if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                        msg += ' You can use a spread to convert this iterable into an array.';
                    }
                    throw new Error(msg);
                }
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

            /* src/components/Hero/Navigation.svelte generated by Svelte v3.26.0 */

            const file = "src/components/Hero/Navigation.svelte";

            function get_each_context(ctx, list, i) {
            	const child_ctx = ctx.slice();
            	child_ctx[8] = list[i].name;
            	child_ctx[9] = list[i].url;
            	return child_ctx;
            }

            function get_each_context_1(ctx, list, i) {
            	const child_ctx = ctx.slice();
            	child_ctx[9] = list[i].url;
            	child_ctx[8] = list[i].name;
            	return child_ctx;
            }

            // (119:4) {#each menu as { url, name }}
            function create_each_block_1(ctx) {
            	let a;
            	let t_value = /*name*/ ctx[8] + "";
            	let t;
            	let a_href_value;

            	const block = {
            		c: function create() {
            			a = element("a");
            			t = text(t_value);
            			this.h();
            		},
            		l: function claim(nodes) {
            			a = claim_element(nodes, "A", { class: true, href: true });
            			var a_nodes = children(a);
            			t = claim_text(a_nodes, t_value);
            			a_nodes.forEach(detach_dev);
            			this.h();
            		},
            		h: function hydrate() {
            			attr_dev(a, "class", "big-nav svelte-fpzbx8");
            			attr_dev(a, "href", a_href_value = /*url*/ ctx[9]);
            			toggle_class(a, "scrolled", /*scrolled*/ ctx[3]);
            			add_location(a, file, 119, 6, 1877);
            		},
            		m: function mount(target, anchor) {
            			insert_dev(target, a, anchor);
            			append_dev(a, t);
            		},
            		p: function update(ctx, dirty) {
            			if (dirty & /*menu*/ 1 && t_value !== (t_value = /*name*/ ctx[8] + "")) set_data_dev(t, t_value);

            			if (dirty & /*menu*/ 1 && a_href_value !== (a_href_value = /*url*/ ctx[9])) {
            				attr_dev(a, "href", a_href_value);
            			}

            			if (dirty & /*scrolled*/ 8) {
            				toggle_class(a, "scrolled", /*scrolled*/ ctx[3]);
            			}
            		},
            		d: function destroy(detaching) {
            			if (detaching) detach_dev(a);
            		}
            	};

            	dispatch_dev("SvelteRegisterBlock", {
            		block,
            		id: create_each_block_1.name,
            		type: "each",
            		source: "(119:4) {#each menu as { url, name }}",
            		ctx
            	});

            	return block;
            }

            // (148:0) {#if menuOpen}
            function create_if_block(ctx) {
            	let div;
            	let ul;
            	let t0;
            	let li0;
            	let a0;
            	let t1;
            	let t2;
            	let li1;
            	let a1;
            	let t3;
            	let t4;
            	let button;
            	let img;
            	let img_src_value;
            	let mounted;
            	let dispose;
            	let each_value = /*menu*/ ctx[0];
            	validate_each_argument(each_value);
            	let each_blocks = [];

            	for (let i = 0; i < each_value.length; i += 1) {
            		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
            	}

            	const block = {
            		c: function create() {
            			div = element("div");
            			ul = element("ul");

            			for (let i = 0; i < each_blocks.length; i += 1) {
            				each_blocks[i].c();
            			}

            			t0 = space();
            			li0 = element("li");
            			a0 = element("a");
            			t1 = text("Sign up");
            			t2 = space();
            			li1 = element("li");
            			a1 = element("a");
            			t3 = text("Twitter");
            			t4 = space();
            			button = element("button");
            			img = element("img");
            			this.h();
            		},
            		l: function claim(nodes) {
            			div = claim_element(nodes, "DIV", { class: true });
            			var div_nodes = children(div);
            			ul = claim_element(div_nodes, "UL", { class: true });
            			var ul_nodes = children(ul);

            			for (let i = 0; i < each_blocks.length; i += 1) {
            				each_blocks[i].l(ul_nodes);
            			}

            			t0 = claim_space(ul_nodes);
            			li0 = claim_element(ul_nodes, "LI", { class: true });
            			var li0_nodes = children(li0);

            			a0 = claim_element(li0_nodes, "A", {
            				class: true,
            				href: true,
            				rel: true,
            				target: true
            			});

            			var a0_nodes = children(a0);
            			t1 = claim_text(a0_nodes, "Sign up");
            			a0_nodes.forEach(detach_dev);
            			li0_nodes.forEach(detach_dev);
            			t2 = claim_space(ul_nodes);
            			li1 = claim_element(ul_nodes, "LI", { class: true });
            			var li1_nodes = children(li1);

            			a1 = claim_element(li1_nodes, "A", {
            				class: true,
            				target: true,
            				rel: true,
            				href: true
            			});

            			var a1_nodes = children(a1);
            			t3 = claim_text(a1_nodes, "Twitter");
            			a1_nodes.forEach(detach_dev);
            			li1_nodes.forEach(detach_dev);
            			ul_nodes.forEach(detach_dev);
            			t4 = claim_space(div_nodes);
            			button = claim_element(div_nodes, "BUTTON", { class: true });
            			var button_nodes = children(button);
            			img = claim_element(button_nodes, "IMG", { class: true, src: true, alt: true });
            			button_nodes.forEach(detach_dev);
            			div_nodes.forEach(detach_dev);
            			this.h();
            		},
            		h: function hydrate() {
            			attr_dev(a0, "class", "small-nav svelte-fpzbx8");
            			attr_dev(a0, "href", "https://forms.gle/6PBKXng9jfrvxjhX8");
            			attr_dev(a0, "rel", "noreferrer");
            			attr_dev(a0, "target", "_blank");
            			add_location(a0, file, 159, 8, 2768);
            			attr_dev(li0, "class", "svelte-fpzbx8");
            			add_location(li0, file, 158, 6, 2755);
            			attr_dev(a1, "class", "small-nav svelte-fpzbx8");
            			attr_dev(a1, "target", "_blank");
            			attr_dev(a1, "rel", "noreferrer");
            			attr_dev(a1, "href", "https://twitter.com/sveltesociety");
            			add_location(a1, file, 168, 8, 2968);
            			attr_dev(li1, "class", "svelte-fpzbx8");
            			add_location(li1, file, 167, 6, 2955);
            			attr_dev(ul, "class", "svelte-fpzbx8");
            			add_location(ul, file, 149, 4, 2539);
            			attr_dev(img, "class", "close svelte-fpzbx8");
            			if (img.src !== (img_src_value = "images/close.svg")) attr_dev(img, "src", img_src_value);
            			attr_dev(img, "alt", "");
            			add_location(img, file, 176, 6, 3192);
            			attr_dev(button, "class", "svelte-fpzbx8");
            			add_location(button, file, 175, 4, 3141);
            			attr_dev(div, "class", "container svelte-fpzbx8");
            			add_location(div, file, 148, 2, 2511);
            		},
            		m: function mount(target, anchor) {
            			insert_dev(target, div, anchor);
            			append_dev(div, ul);

            			for (let i = 0; i < each_blocks.length; i += 1) {
            				each_blocks[i].m(ul, null);
            			}

            			append_dev(ul, t0);
            			append_dev(ul, li0);
            			append_dev(li0, a0);
            			append_dev(a0, t1);
            			append_dev(ul, t2);
            			append_dev(ul, li1);
            			append_dev(li1, a1);
            			append_dev(a1, t3);
            			append_dev(div, t4);
            			append_dev(div, button);
            			append_dev(button, img);

            			if (!mounted) {
            				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[7], false, false, false);
            				mounted = true;
            			}
            		},
            		p: function update(ctx, dirty) {
            			if (dirty & /*menu, menuOpen*/ 5) {
            				each_value = /*menu*/ ctx[0];
            				validate_each_argument(each_value);
            				let i;

            				for (i = 0; i < each_value.length; i += 1) {
            					const child_ctx = get_each_context(ctx, each_value, i);

            					if (each_blocks[i]) {
            						each_blocks[i].p(child_ctx, dirty);
            					} else {
            						each_blocks[i] = create_each_block(child_ctx);
            						each_blocks[i].c();
            						each_blocks[i].m(ul, t0);
            					}
            				}

            				for (; i < each_blocks.length; i += 1) {
            					each_blocks[i].d(1);
            				}

            				each_blocks.length = each_value.length;
            			}
            		},
            		d: function destroy(detaching) {
            			if (detaching) detach_dev(div);
            			destroy_each(each_blocks, detaching);
            			mounted = false;
            			dispose();
            		}
            	};

            	dispatch_dev("SvelteRegisterBlock", {
            		block,
            		id: create_if_block.name,
            		type: "if",
            		source: "(148:0) {#if menuOpen}",
            		ctx
            	});

            	return block;
            }

            // (151:6) {#each menu as { name, url }}
            function create_each_block(ctx) {
            	let li;
            	let a;
            	let t_value = /*name*/ ctx[8] + "";
            	let t;
            	let a_href_value;
            	let mounted;
            	let dispose;

            	const block = {
            		c: function create() {
            			li = element("li");
            			a = element("a");
            			t = text(t_value);
            			this.h();
            		},
            		l: function claim(nodes) {
            			li = claim_element(nodes, "LI", { class: true });
            			var li_nodes = children(li);
            			a = claim_element(li_nodes, "A", { class: true, href: true });
            			var a_nodes = children(a);
            			t = claim_text(a_nodes, t_value);
            			a_nodes.forEach(detach_dev);
            			li_nodes.forEach(detach_dev);
            			this.h();
            		},
            		h: function hydrate() {
            			attr_dev(a, "class", "small-nav svelte-fpzbx8");
            			attr_dev(a, "href", a_href_value = "/" + /*url*/ ctx[9]);
            			add_location(a, file, 152, 10, 2603);
            			attr_dev(li, "class", "svelte-fpzbx8");
            			add_location(li, file, 151, 8, 2588);
            		},
            		m: function mount(target, anchor) {
            			insert_dev(target, li, anchor);
            			append_dev(li, a);
            			append_dev(a, t);

            			if (!mounted) {
            				dispose = listen_dev(a, "click", /*click_handler_1*/ ctx[6], false, false, false);
            				mounted = true;
            			}
            		},
            		p: function update(ctx, dirty) {
            			if (dirty & /*menu*/ 1 && t_value !== (t_value = /*name*/ ctx[8] + "")) set_data_dev(t, t_value);

            			if (dirty & /*menu*/ 1 && a_href_value !== (a_href_value = "/" + /*url*/ ctx[9])) {
            				attr_dev(a, "href", a_href_value);
            			}
            		},
            		d: function destroy(detaching) {
            			if (detaching) detach_dev(li);
            			mounted = false;
            			dispose();
            		}
            	};

            	dispatch_dev("SvelteRegisterBlock", {
            		block,
            		id: create_each_block.name,
            		type: "each",
            		source: "(151:6) {#each menu as { name, url }}",
            		ctx
            	});

            	return block;
            }

            function create_fragment(ctx) {
            	let scrolling = false;

            	let clear_scrolling = () => {
            		scrolling = false;
            	};

            	let scrolling_timeout;
            	let div0;
            	let nav;
            	let t0;
            	let a0;
            	let t1;
            	let t2;
            	let a1;
            	let span;
            	let img0;
            	let img0_src_value;
            	let t3;
            	let t4;
            	let div1;
            	let img1;
            	let img1_src_value;
            	let t5;
            	let if_block_anchor;
            	let mounted;
            	let dispose;
            	add_render_callback(/*onwindowscroll*/ ctx[4]);
            	let each_value_1 = /*menu*/ ctx[0];
            	validate_each_argument(each_value_1);
            	let each_blocks = [];

            	for (let i = 0; i < each_value_1.length; i += 1) {
            		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
            	}

            	let if_block = /*menuOpen*/ ctx[2] && create_if_block(ctx);

            	const block = {
            		c: function create() {
            			div0 = element("div");
            			nav = element("nav");

            			for (let i = 0; i < each_blocks.length; i += 1) {
            				each_blocks[i].c();
            			}

            			t0 = space();
            			a0 = element("a");
            			t1 = text("Sign Up");
            			t2 = space();
            			a1 = element("a");
            			span = element("span");
            			img0 = element("img");
            			t3 = text(" Twitter");
            			t4 = space();
            			div1 = element("div");
            			img1 = element("img");
            			t5 = space();
            			if (if_block) if_block.c();
            			if_block_anchor = empty();
            			this.h();
            		},
            		l: function claim(nodes) {
            			div0 = claim_element(nodes, "DIV", { class: true });
            			var div0_nodes = children(div0);
            			nav = claim_element(div0_nodes, "NAV", {});
            			var nav_nodes = children(nav);

            			for (let i = 0; i < each_blocks.length; i += 1) {
            				each_blocks[i].l(nav_nodes);
            			}

            			t0 = claim_space(nav_nodes);

            			a0 = claim_element(nav_nodes, "A", {
            				class: true,
            				rel: true,
            				href: true,
            				target: true
            			});

            			var a0_nodes = children(a0);
            			t1 = claim_text(a0_nodes, "Sign Up");
            			a0_nodes.forEach(detach_dev);
            			t2 = claim_space(nav_nodes);

            			a1 = claim_element(nav_nodes, "A", {
            				class: true,
            				rel: true,
            				target: true,
            				href: true
            			});

            			var a1_nodes = children(a1);
            			span = claim_element(a1_nodes, "SPAN", { class: true });
            			var span_nodes = children(span);
            			img0 = claim_element(span_nodes, "IMG", { class: true, src: true, alt: true });
            			t3 = claim_text(span_nodes, " Twitter");
            			span_nodes.forEach(detach_dev);
            			a1_nodes.forEach(detach_dev);
            			nav_nodes.forEach(detach_dev);
            			div0_nodes.forEach(detach_dev);
            			t4 = claim_space(nodes);
            			div1 = claim_element(nodes, "DIV", { class: true });
            			var div1_nodes = children(div1);
            			img1 = claim_element(div1_nodes, "IMG", { src: true, alt: true });
            			div1_nodes.forEach(detach_dev);
            			t5 = claim_space(nodes);
            			if (if_block) if_block.l(nodes);
            			if_block_anchor = empty();
            			this.h();
            		},
            		h: function hydrate() {
            			attr_dev(a0, "class", "big-nav svelte-fpzbx8");
            			attr_dev(a0, "rel", "noreferrer");
            			attr_dev(a0, "href", "https://forms.gle/6PBKXng9jfrvxjhX8");
            			attr_dev(a0, "target", "_blank");
            			toggle_class(a0, "scrolled", /*scrolled*/ ctx[3]);
            			add_location(a0, file, 122, 4, 1952);
            			attr_dev(img0, "class", "twitter svelte-fpzbx8");
            			if (img0.src !== (img0_src_value = "/images/twitter.svg")) attr_dev(img0, "src", img0_src_value);
            			attr_dev(img0, "alt", "");
            			add_location(img0, file, 138, 8, 2281);
            			attr_dev(span, "class", "svelte-fpzbx8");
            			add_location(span, file, 137, 6, 2266);
            			attr_dev(a1, "class", "big-nav svelte-fpzbx8");
            			attr_dev(a1, "rel", "noreferrer");
            			attr_dev(a1, "target", "_blank");
            			attr_dev(a1, "href", "https://twitter.com/sveltesociety");
            			toggle_class(a1, "scrolled", /*scrolled*/ ctx[3]);
            			add_location(a1, file, 131, 4, 2121);
            			add_location(nav, file, 117, 2, 1831);
            			attr_dev(div0, "class", "navcontainer svelte-fpzbx8");
            			toggle_class(div0, "scrolled", /*scrolled*/ ctx[3]);
            			add_location(div0, file, 116, 0, 1787);
            			if (img1.src !== (img1_src_value = "/images/burger.svg")) attr_dev(img1, "src", img1_src_value);
            			attr_dev(img1, "alt", "");
            			add_location(img1, file, 144, 2, 2446);
            			attr_dev(div1, "class", "hamburger svelte-fpzbx8");
            			add_location(div1, file, 143, 0, 2385);
            		},
            		m: function mount(target, anchor) {
            			insert_dev(target, div0, anchor);
            			append_dev(div0, nav);

            			for (let i = 0; i < each_blocks.length; i += 1) {
            				each_blocks[i].m(nav, null);
            			}

            			append_dev(nav, t0);
            			append_dev(nav, a0);
            			append_dev(a0, t1);
            			append_dev(nav, t2);
            			append_dev(nav, a1);
            			append_dev(a1, span);
            			append_dev(span, img0);
            			append_dev(span, t3);
            			insert_dev(target, t4, anchor);
            			insert_dev(target, div1, anchor);
            			append_dev(div1, img1);
            			insert_dev(target, t5, anchor);
            			if (if_block) if_block.m(target, anchor);
            			insert_dev(target, if_block_anchor, anchor);

            			if (!mounted) {
            				dispose = [
            					listen_dev(window, "scroll", () => {
            						scrolling = true;
            						clearTimeout(scrolling_timeout);
            						scrolling_timeout = setTimeout(clear_scrolling, 100);
            						/*onwindowscroll*/ ctx[4]();
            					}),
            					listen_dev(div1, "click", /*click_handler*/ ctx[5], false, false, false)
            				];

            				mounted = true;
            			}
            		},
            		p: function update(ctx, [dirty]) {
            			if (dirty & /*y*/ 2 && !scrolling) {
            				scrolling = true;
            				clearTimeout(scrolling_timeout);
            				scrollTo(window.pageXOffset, /*y*/ ctx[1]);
            				scrolling_timeout = setTimeout(clear_scrolling, 100);
            			}

            			if (dirty & /*menu, scrolled*/ 9) {
            				each_value_1 = /*menu*/ ctx[0];
            				validate_each_argument(each_value_1);
            				let i;

            				for (i = 0; i < each_value_1.length; i += 1) {
            					const child_ctx = get_each_context_1(ctx, each_value_1, i);

            					if (each_blocks[i]) {
            						each_blocks[i].p(child_ctx, dirty);
            					} else {
            						each_blocks[i] = create_each_block_1(child_ctx);
            						each_blocks[i].c();
            						each_blocks[i].m(nav, t0);
            					}
            				}

            				for (; i < each_blocks.length; i += 1) {
            					each_blocks[i].d(1);
            				}

            				each_blocks.length = each_value_1.length;
            			}

            			if (dirty & /*scrolled*/ 8) {
            				toggle_class(a0, "scrolled", /*scrolled*/ ctx[3]);
            			}

            			if (dirty & /*scrolled*/ 8) {
            				toggle_class(a1, "scrolled", /*scrolled*/ ctx[3]);
            			}

            			if (dirty & /*scrolled*/ 8) {
            				toggle_class(div0, "scrolled", /*scrolled*/ ctx[3]);
            			}

            			if (/*menuOpen*/ ctx[2]) {
            				if (if_block) {
            					if_block.p(ctx, dirty);
            				} else {
            					if_block = create_if_block(ctx);
            					if_block.c();
            					if_block.m(if_block_anchor.parentNode, if_block_anchor);
            				}
            			} else if (if_block) {
            				if_block.d(1);
            				if_block = null;
            			}
            		},
            		i: noop,
            		o: noop,
            		d: function destroy(detaching) {
            			if (detaching) detach_dev(div0);
            			destroy_each(each_blocks, detaching);
            			if (detaching) detach_dev(t4);
            			if (detaching) detach_dev(div1);
            			if (detaching) detach_dev(t5);
            			if (if_block) if_block.d(detaching);
            			if (detaching) detach_dev(if_block_anchor);
            			mounted = false;
            			run_all(dispose);
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
            	validate_slots("Navigation", slots, []);
            	let y;
            	let { menu } = $$props;
            	let menuOpen = false;
            	const writable_props = ["menu"];

            	Object.keys($$props).forEach(key => {
            		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Navigation> was created with unknown prop '${key}'`);
            	});

            	function onwindowscroll() {
            		$$invalidate(1, y = window.pageYOffset);
            	}

            	const click_handler = () => $$invalidate(2, menuOpen = true);
            	const click_handler_1 = () => $$invalidate(2, menuOpen = false);
            	const click_handler_2 = () => $$invalidate(2, menuOpen = false);

            	$$self.$$set = $$props => {
            		if ("menu" in $$props) $$invalidate(0, menu = $$props.menu);
            	};

            	$$self.$capture_state = () => ({ y, menu, menuOpen, scrolled });

            	$$self.$inject_state = $$props => {
            		if ("y" in $$props) $$invalidate(1, y = $$props.y);
            		if ("menu" in $$props) $$invalidate(0, menu = $$props.menu);
            		if ("menuOpen" in $$props) $$invalidate(2, menuOpen = $$props.menuOpen);
            		if ("scrolled" in $$props) $$invalidate(3, scrolled = $$props.scrolled);
            	};

            	let scrolled;

            	if ($$props && "$$inject" in $$props) {
            		$$self.$inject_state($$props.$$inject);
            	}

            	$$self.$$.update = () => {
            		if ($$self.$$.dirty & /*y*/ 2) {
            			 $$invalidate(3, scrolled = y > 100);
            		}
            	};

            	return [
            		menu,
            		y,
            		menuOpen,
            		scrolled,
            		onwindowscroll,
            		click_handler,
            		click_handler_1,
            		click_handler_2
            	];
            }

            class Navigation extends SvelteComponentDev {
            	constructor(options) {
            		super(options);
            		init(this, options, instance, create_fragment, not_equal, { menu: 0 });

            		dispatch_dev("SvelteRegisterComponent", {
            			component: this,
            			tagName: "Navigation",
            			options,
            			id: create_fragment.name
            		});

            		const { ctx } = this.$$;
            		const props = options.props || {};

            		if (/*menu*/ ctx[0] === undefined && !("menu" in props)) {
            			console.warn("<Navigation> was created without expected prop 'menu'");
            		}
            	}

            	get menu() {
            		throw new Error("<Navigation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
            	}

            	set menu(value) {
            		throw new Error("<Navigation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
            	}
            } exports('default', Navigation);

        }
    };
});
//# sourceMappingURL=entryNavigation.js.map