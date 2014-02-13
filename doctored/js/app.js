/*globals doctored, alert, console, confirm, prompt*/
(function(){
    "use strict";

    var defaults = {
            autosave_every_milliseconds:      30 * 1000,
            linting_debounce_milliseconds:    1000,
            retry_init_after_milliseconds:    50,
            format:                           "docbook", //key from doctored.formats in app-formats.js
            theme:                            "flat" //key from options in hamburger_menu.theme_chooser
        },
        $ = doctored.$,
        $body = $('body')[0],
        transition_end_event = function(){
            var element = document.createElement('fakeelement'),
                transitions = {
                'transition':       'transitionend',
                'OTransition':      'otransitionEnd',
                'MozTransition':    'transitionend',
                'WebkitTransition': 'webkitTransitionEnd'
                },
                key;

            for(key in transitions){
                if(element.style[key] !== undefined){
                    return transitions[key];
                }
            }
        }(); //self executing in order to calculate the result once

    doctored.event.on("app:ready", function(){
        // called after all manifest items (in doctored.js) are loaded
        var i,
            instance;

        doctored.ready = true;
        for(i = 0; i < doctored._to_be_initialized.length; i++){
            instance = doctored._to_be_initialized[i];
            doctored._init(instance.selector, instance.options);
        }
    });

    doctored._init = function(selector, options){
        var root_element = $(selector),
            instance,
            property;

        if(!root_element) return console.log("Doctored.js: Unable to find the element selected by: " + selector);
        if (typeof defaults.format === 'string' || defaults.format instanceof String) defaults.format = doctored.formats[defaults.format];

        options = options || {};
        for (property in defaults) {
            if (options.hasOwnProperty(property)) continue;
            options[property] = defaults[property];
        }

        instance = {
            doctored: 0.9,
            root: root_element,
            root_selector: selector,
            options: options,
            cache: {},
            init: function(){
                var _this = this,
                    menu,
                    i,
                    lint = doctored.util.debounce(_this.lint, _this.options.linting_debounce_milliseconds, _this),
                    this_function = doctored.util.this_function,
                    theme = window.localStorage.getItem("doctored-theme");
                
                this.options.format.init(this);
                this.id = 'doctored_xxxxxxxxxxxx'.replace(/x/g, function(){return (Math.random()*16|0).toString(16);});
                this.root.setAttribute("data-element", this.options.format.root_element);
                this.root.setAttribute("data-attributes", doctored.util.encode_data_attributes(this.options.format.root_attributes));
                this.root.contentEditable = true;
                this.root.className = "doctored";
                this.root.addEventListener("input",     lint, false);
                this.root.addEventListener('paste',     this_function(this.paste, this), false);
                this.root.addEventListener('mouseup',   this_function(this.click, this), false);
                this.root.addEventListener('touchend',  this_function(this.click, this), false);
                this.root.addEventListener('keyup',     this_function(this.keyup_contentEditable, this), false);
                this.root.addEventListener('mousemove', this_function(this.mousemove, this), false);
                this.menu = document.createElement('menu');
                this.menu.className = "doctored-menu";
                this.dialog = document.createElement('menu');
                this.dialog.className = "doctored-dialog";
                this.dialog.addEventListener('keyup',   this_function(this.keyup_dialog_esc, this), false);
                this.dialog.innerHTML = '<a href title="Close">&times;</a><label for="' + this.id + '_formats">format: </label><select  id="' + this.id + '_formats">' + doctored.util.to_options_tags(Object.keys(doctored.formats), false) + '</select>' +
                                        '<h6>root element</h6><select id="' + this.id + '_elements" title="Change element"><option>Loading...</option></select>' +
                                        '<h6>attributes</h6><div></div>';
                this.dialog.close = $('a', this.dialog)[0];
                this.dialog.close.addEventListener('click', this_function(this.close_dialog, this), false);
                this.dialog.format_chooser = $('select', this.dialog)[0];
                this.dialog.format_chooser_label = $('label', this.dialog)[0];
                this.dialog.attributes_h6 = $('h6', this.dialog)[1];
                this.dialog.element_chooser = $('select', this.dialog)[1];
                this.dialog.element_chooser.addEventListener('blur', this_function(this.element_chooser_change, this), false);
                this.dialog.element_chooser.addEventListener('mouseup', this_function(this.element_chooser_change, this), false);
                this.dialog.root_element_title = $('h6', this.dialog)[0];
                this.dialog.attributes_div = $('div', this.dialog)[0];
                this.dialog.attributes_div.addEventListener('keyup',   this_function(this.keyup_dialog_attributes_enter, this), false);
                this.dialog.attributes_template = document.createElement("div");
                this.dialog.attributes_template.innerHTML = '<input class="doctored-attribute-name">=<input class="doctored-attribute-value">';
                this.dialog.attributes_add = this.dialog.attributes_template.cloneNode(true);
                this.dialog.attributes_add.childNodes[0].addEventListener("focus", this_function(this.add_attribute_item_key, this), false);
                this.dialog.attributes_add.childNodes[2].addEventListener("focus", this_function(this.add_attribute_item_value, this), false);
                this.dialog.attributes_div.appendChild(this.dialog.attributes_add);
                this.menu.innerHTML = '<a class="doctored-hamburger" href title="Editor Configuration">&#9776;</a><a class="doctored-properties" href="" title="Document Properties">Document</a><a class="doctored-view-source" href="">View Source</a><a class="doctored-download" href="">Download</a>';
                this.menu.hamburger_button = $(".doctored-hamburger", this.menu)[0];
                this.menu.hamburger_button.addEventListener('click', this_function(this.hamburger_button_click, this), false);
                this.hamburger_menu = document.createElement("menu");
                this.hamburger_menu.className = "doctored-hamburger";
                this.hamburger_menu.innerHTML = '<a href title="Close">&times;</a><select><option value="" disabled selected>Choose Theme</option><option>Flat</option><option>Shadow</option><option>High Contrast</option></select>';
                this.hamburger_menu.theme_chooser = $("select", this.hamburger_menu)[0];
                this.hamburger_menu.theme_chooser.addEventListener('change', this_function(this.hamburger_change_theme, this), false);
                this.hamburger_menu.close = $("a", this.hamburger_menu)[0];
                this.hamburger_menu.close.addEventListener('click', this_function(this.hamburger_close, this), false);
                this.menu.properties_button = $(".doctored-properties", this.menu)[0];
                this.menu.properties_button.addEventListener('click', this_function(this.properties, this), false);
                this.menu.download = $(".doctored-download", this.menu)[0];
                this.menu.download.addEventListener('click', this_function(this.download, this), false);
                this.menu.view_source = $(".doctored-view-source", this.menu)[0];
                this.menu.view_source.addEventListener('click', this_function(this.view_source, this), false);
                this.tooltip = document.createElement('samp');
                this.tooltip.className = "doctored-tooltip";
                this.tooltip.addEventListener(transition_end_event, this_function(this.hide_tooltip, this), false);
                this.attributes_template = "";
                this.options.localStorage_key = this.options.localStorage_key || this.root_selector.replace(/[#-]/g, "").replace(/\s/g, "");
                doctored.util.set_theme(theme || this.options.theme, this);
                this.root.parentNode.insertBefore(this.menu, this.root);
                this.root.parentNode.insertBefore(this.dialog, this.menu);
                this.root.parentNode.insertBefore(this.tooltip, this.dialog);
                this.root.parentNode.insertBefore(this.hamburger_menu, this.tooltip);
                if(window.localStorage) {
                    this.save_timer = setInterval(function(){ _this.save.apply(_this); }, this.options.autosave_every_milliseconds);
                }
                lint();
                if(this.options.onload) {
                    this_function(this.options.onload, this)();
                }
            },
            lint: function(){
                // send linting job to one of the workers
                doctored.linters.lint(this.get_xml_string(), this.options.format.schema_url, this.lint_response, instance);
            },
            lint_response: function(errors){
                // handle a linting response, and write it to the page
                var by_line = doctored.util.lint_response(errors, this.root.childNodes.length),
                    i,
                    child_node,
                    line_number = 0;

                for(i = 0; i < this.root.childNodes.length; i++){
                    child_node = this.root.childNodes[i];
                    if(child_node.nodeType === Node.ELEMENT_NODE){ //ignore text nodes etc
                        line_number += 1;
                        if(by_line[line_number]) {
                            child_node.setAttribute("data-error", doctored.util.format_lint_errors(by_line[line_number]));
                            child_node.classList.add("has_errors");
                            child_node.classList.remove("hide_errors");
                        } else {
                            child_node.setAttribute("data-error", "");
                            child_node.classList.remove("has_errors");
                            child_node.classList.add("hide_errors");
                        }
                    }
                }
                if(errors && errors.error_lines && errors.error_lines.length === 0) {
                    this.root.classList.add("valid");
                    this.root.classList.remove("invalid");
                } else {
                    this.root.classList.add("invalid");
                    this.root.classList.remove("valid");
                }
            },
            get_xml_string: function(){
                return doctored.CONSTANTS.xml_declaration + doctored.util.descend_building_xml([this.root]);
            },
            save: function(event){
                var localStorage_key,
                    xml;

                localStorage_key = this.options.localStorage_key;
                window.localStorage.setItem(localStorage_key, this.get_xml_string());
            },
            paste: function(event){
                var html = doctored.util.get_clipboard_xml_as_html_string(event.clipboardData),
                    doctored_html;

                if(this.options.format.convert_from_html && doctored.util.looks_like_html(html)) {
                    event.returnValue = false;
                    setTimeout(function(){ //for some reason in Chrome it runs confirm twice when it's not in a setTimeout. Odd, suspected browser bug.
                        if(confirm("That looks like HTML - want to convert it to " + this.options.format.name + "?")) {
                            html = this.options.format.convert_from_html(html);
                        }
                        doctored_html = doctored.util.convert_html_to_doctored_html(html);
                        doctored.util.insert_html_at_cursor_position(doctored_html, event);
                    }, 0);
                    return;
                }
                doctored_html = doctored.util.convert_xml_to_doctored_html(html);
                doctored.util.insert_html_at_cursor_position(doctored_html, event);
            },
            element_chooser_change: function(event){
                // actually the blur event from dialog's <select> calls this
                if(this.cache.just_hit_esc) {
                    this.cache.just_hit_esc = false;
                    return;
                }
                switch(this.dialog.mode){
                    case "createElement":
                        doctored.util.this_function(this.update_element, this)(event);
                        this.dialog.style.display = "none";
                        delete this.dialog.target;
                        break;
                    case "editElement":
                        doctored.util.this_function(this.update_element, this)(event);
                        break;
                    default:
                        alert("Unrecognised dialog mode " + this.dialog.mode);
                }
            },
            update_element: function(event){
                // after choosing an element in the dialog... (see element_chooser_change, above)
                var dialog          = this.dialog,
                    element_chooser = dialog.element_chooser,
                    option          = element_chooser.options[this.dialog.element_chooser.selectedIndex],
                    option_value    = option.getAttribute("value"),
                    element_name    = option.innerText,
                    display_type    = "block";

                if(option_value.length === 0) return doctored.util.remove_old_selection(dialog.target, dialog);
                if(!dialog.target) return "Trying to update element when there is no target?";
                if(!dialog.target.classList.contains("doctored")) { //set it unless it's the Doctored root node
                    switch(option_value){
                        case "inline":
                        case "block":
                            display_type = option_value;
                    }
                    dialog.target.className = doctored.CONSTANTS.block_or_inline_class_prefix + display_type; //must clobber other values
                }
                if(option_value === "(custom)") {
                    element_name = prompt("Custom element:");
                    if(!element_name) return doctored.util.remove_old_selection(dialog.target, dialog);
                    console.log(element_name)
                }
                dialog.target.setAttribute("data-element", element_name);
            },
            properties: function(event){
                // clicking the 'properties' button
                doctored.util.display_element_dialog(this.root, this.dialog);
                event.preventDefault();
            },
            hamburger_button_click: function(event){
                var position = this.menu.hamburger_button.getBoundingClientRect();

                this.hamburger_menu.style.left = (position.left + position.width) + "px";
                this.hamburger_menu.style.top = position.top + "px";
                this.hamburger_menu.style.display = "block";
                event.preventDefault();
            },
            hamburger_change_theme: function(event){
                var theme_chooser  = this.hamburger_menu.theme_chooser,
                    option         = theme_chooser.options[theme_chooser.selectedIndex],
                    option_text    = option.textContent;

                window.localStorage.setItem("doctored-theme", option_text);
                doctored.util.set_theme(option_text, this);
                this.hamburger_menu.style.display = "none";
                theme_chooser.selectedIndex = 0;
                event.preventDefault();
            },
            hamburger_close: function(event){
                this.hamburger_menu.style.display = "none";
                event.preventDefault();
            },
            close_dialog: function(event){
                // simply, clicking [x] in the dialog
                this.dialog.style.display = "none";
                doctored.util.remove_old_selection(this.dialog.target, this);
                event.preventDefault();
            },
            view_source: function(event){
                // clicking 'View Source' button
                var _this    = this,
                    xml      = this.get_xml_string(),
                    textarea = document.createElement('textarea');

                textarea.classList.add("doctored-view-source-textbox");
                textarea.textContent = xml;
                $body.appendChild(textarea);
                textarea.focus();
                textarea.addEventListener('blur', function(){
                    var xml = this.value;
                    xml = xml.substr(xml.indexOf("\n") + 1);
                    xml = xml.substr(0, xml.lastIndexOf("\n"));
                    _this.root.innerHTML = doctored.util.convert_xml_to_doctored_html(xml, _this.options.format.elements);
                    if(this && this.parentNode) {
                        try {
                            this.parentNode.removeChild(this); //FIXME: this try/catch is to work around DOM errors where the node doesn't exist despite the if() check. Investigate later.
                        }catch(exception){}
                    }}, false);
                event.preventDefault();
            },
            download: function(event){
                // clicking the 'Download' button
                var xml      = this.get_xml_string(),
                    filename = this.root_selector.replace(/[#-]/g, "").replace(/\s/g, "") + xml.replace(/<[^>]*?>/g, "").replace(/\s/g, "");

                if(filename.length > 10) filename = filename.substr(0, 10);
                else if(filename.length < 4) filename = "download";
                filename += ".xml";
                event.preventDefault();
                doctored.util.offer_download(xml, filename);
            },
            keyup_dialog_esc: function(event){
                // keyup event in the dialog, and we're only interested in the 'esc' key
                var esc_key = 27;

                if(event.keyCode != esc_key) return;
                doctored.util.remove_old_selection(this.dialog.target, this);
                this.dialog.style.display = "none";
                this.cache.just_hit_esc = true;
            },
            keyup_dialog_attributes_enter: function(event){
                // keyup event occuring in the dialog attributes div, and we're only interested in 'enter' key
                var enter_key = 13,
                    attributes,
                    selection;

                if(event.keyCode != enter_key) return;
                attributes = doctored.util.gather_attributes(this.dialog.attributes_div.childNodes);
                this.dialog.target.setAttribute('data-attributes', doctored.util.encode_data_attributes(attributes));
                this.dialog.style.display = "none";
                delete this.dialog.target;
            },
            keyup_contentEditable: function(event){
                // keyup event occuring in the editable area
                var esc_key = 27,
                    browser_selection,
                    parentNode;

                if(event.keyCode === esc_key){
                    browser_selection = doctored.util.get_current_selection();
                    parentNode = browser_selection.getRangeAt(0).endContainer.parentNode;
                    doctored.util.display_element_dialog(parentNode, this.dialog);
                    this.dialog.element_chooser.focus();
                } else if(event.shiftKey === false){
                    doctored.util.this_function(this.click, this)(event);
                }
            },
            click: function(event){
                var browser_selection = doctored.util.get_current_selection(),
                    target   = event.toElement || event.target,
                    mouse_position = event.x ? {x:event.x, y:event.y} : undefined,
                    within_pseudoelement = doctored.util.within_pseudoelement(target, mouse_position),
                    new_doctored_selection;

                this.dialog.style.display = "none";
                doctored.util.remove_old_selection(this.dialog.target, this.dialog);
                if (browser_selection.rangeCount) {
                    new_doctored_selection = doctored.util.surround_selection_with_element("div", "doctored-selection", this, browser_selection, mouse_position);
                    if(new_doctored_selection && new_doctored_selection.parentNode) { //if it's attached to the page
                        doctored.util.display_dialog_around_inline(new_doctored_selection, this.dialog, mouse_position, this.options.format);
                    } else if(within_pseudoelement) {
                        doctored.util.display_element_dialog(target, this.dialog, mouse_position, this.options.format);
                    }
                } else if(within_pseudoelement) {
                    doctored.util.display_element_dialog(target, this.dialog, mouse_position, this.options.format);
                }
            },
            add_attribute_item: function(){
                var attributes_item = this.dialog.attributes_template.cloneNode(true);

                this.dialog.attributes_add.parentNode.insertBefore(attributes_item, this.dialog.attributes_add);
                return attributes_item;
            },
            add_attribute_item_key: function(event){
                doctored.util.this_function(this.add_attribute_item, this)().childNodes[0].focus();
            },
            add_attribute_item_value: function(event){
                doctored.util.this_function(this.add_attribute_item, this)().childNodes[2].focus();
            },
            mousemove: function(event){
                var target   = event.toElement || event.target,
                    cursor   = "auto";

                if(!target) return;
                if(doctored.util.within_pseudoelement(target, {x:event.x,y:event.y})) cursor = "pointer";
                this.root.style.cursor = cursor;
            },
            show_tooltip: function(text, x, y){
                var _this = this;

                this.tooltip.innerHTML = text;
                this.tooltip.style.left = x + "px";
                this.tooltip.style.top = y + "px";
                this.tooltip.style.display = "block";
                this.tooltip.classList.remove("doctored-hidden");
                if(this.tooltip.timer) clearTimeout(this.tooltip.timer);
                this.tooltip.timer = setTimeout(function(){
                    _this.tooltip.classList.add("doctored-hidden");
                }, 1000);
            },
            hide_tooltip: function(event){
                this.tooltip.style.display = "none";
            }
        };
        instance.init();
        doctored.instances = doctored.instances || [];
        doctored.instances.push(instance);
        return instance;
    };

    doctored.CONSTANTS = {
        inline_label_height_in_pixels: 10,
        block_label_width_in_pixels:   25,
        xml_declaration: '<?xml version="1.0" ?>',
        theme_prefix: 'doctored-theme-',
        block_or_inline_class_prefix: 'doctored-'
    };
    doctored.CONSTANTS.block_class  = doctored.CONSTANTS.block_or_inline_class_prefix + 'block';
    doctored.CONSTANTS.inline_class = doctored.CONSTANTS.block_or_inline_class_prefix + 'inline';

}());