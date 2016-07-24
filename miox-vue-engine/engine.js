/**
 * Created by evio on 16/7/22.
 */
'use strict';

import isClass from 'is-class';
import Vue from 'vue';

export default class Engine {
    constructor(ctx){
        this.ctx = ctx;
    }

    async create(webview){
        const ctx = this.ctx;
        if ( !isClass(webview) ){
            throw new Error('`webview` argument is not a class object.');
        }
        return ctx.set(ctx.req.nextKey, await new Promise((resolve, reject) => {
            const web = new webview(this.createWebviewRoot());
            web.on('ready', () => resolve(web));
            web.on('error', reject);
            web.__defineCompile__();
        }));
    }

    createWebviewRoot(){
        const element = document.createElement('div');
        this.ctx.webviewsElement.appendChild(element);
        element.classList.add('mx-webview');
        element.setAttribute('webview-key', this.ctx.req.nextKey);
        return element;
    }

    install() {
        const ctx = this.ctx;
        ['createForward', 'createBackward', 'forward', 'backward'].forEach( which => {
            if ( ctx[which] ){
                Vue.prototype[which] = url => ctx[which](url);
                Vue.directive(toLinkString(which), PatchURL(which));
            }
        });
    }
}

function PatchURL(method){
    return {
        priority: 3000,
        twoWay: true,
        acceptStatement: true,
        params: ['patch'],
        bind(){
            Vue.util.on(this.el, 'click', this.__patchURLCallback__ = () => {
                if ( !this.params.patch ) return;
                this.vm.$root[method](this.params.patch);
            });
        },
        unbind(){
            Vue.util.off(this.el, 'click', this.__patchURLCallback__);
            delete this.__patchURLCallback__;
        }
    }
}

function toLinkString(s){
    return s.replace(/([A-Z])/g,"-$1").toLowerCase()
}