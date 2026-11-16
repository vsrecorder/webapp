'use strict';

// deepmerge 4.3.1 の dist/cjs.js に、GHSA-gcqx-w48m-w2h4(CVE-2026-93753)の修正を当てたもの。
// 上流(TehShrike/deepmerge)は 4.3.1 のまま修正版を出していないため、
// package.json の overrides でこのコピーに差し替えている(使っているのは @heroui/theme)。
//
// 脆弱性: 防御が「キー名」ではなく「target の状態」で判定していたため、target が
// null プロトタイプのオブジェクト・null の値・own の __proto__ を持つときに素通りし、
// destination[key] = value の代入で __proto__ のセッターが動いて、返り値のプロトタイプを
// 差し替えられた。
//
// 修正(issue #273 の推奨どおり。変更箇所には「修正:」と書いてある):
// - __proto__ / constructor / prototype のキーは、target 側・source 側の両方のループで捨てる
// - 書き込みは defineProperty にして、どんなキー名でも __proto__ のセッターを通さない
// - propertyIsOnObject で in が例外を投げたときは「ある」とみなし、安全側に倒す
// それ以外の動き(配列の結合・clone・customMerge・all など)は原本と同じ。

var isMergeableObject = function isMergeableObject(value) {
	return isNonNullObject(value)
		&& !isSpecial(value)
};

function isNonNullObject(value) {
	return !!value && typeof value === 'object'
}

function isSpecial(value) {
	var stringValue = Object.prototype.toString.call(value);

	return stringValue === '[object RegExp]'
		|| stringValue === '[object Date]'
		|| isReactElement(value)
}

// see https://github.com/facebook/react/blob/b5ac963fb791d1298e7f396236383bc955f916c1/src/isomorphic/classic/element/ReactElement.js#L21-L25
var canUseSymbol = typeof Symbol === 'function' && Symbol.for;
var REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for('react.element') : 0xeac7;

function isReactElement(value) {
	return value.$$typeof === REACT_ELEMENT_TYPE
}

function emptyTarget(val) {
	return Array.isArray(val) ? [] : {}
}

function cloneUnlessOtherwiseSpecified(value, options) {
	return (options.clone !== false && options.isMergeableObject(value))
		? deepmerge(emptyTarget(value), value, options)
		: value
}

function defaultArrayMerge(target, source, options) {
	return target.concat(source).map(function(element) {
		return cloneUnlessOtherwiseSpecified(element, options)
	})
}

function getMergeFunction(key, options) {
	if (!options.customMerge) {
		return deepmerge
	}
	var customMerge = options.customMerge(key);
	return typeof customMerge === 'function' ? customMerge : deepmerge
}

function getEnumerableOwnPropertySymbols(target) {
	return Object.getOwnPropertySymbols
		? Object.getOwnPropertySymbols(target).filter(function(symbol) {
			return Object.propertyIsEnumerable.call(target, symbol)
		})
		: []
}

function getKeys(target) {
	return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target))
}

// 修正: in が例外を投げたとき(Proxy の has トラップなど)は false ではなく true を返す。
// true なら下の propertyIsUnsafe で「own かつ列挙可能」でない限り捨てられる。
function propertyIsOnObject(object, property) {
	try {
		return property in object
	} catch(_) {
		return true
	}
}

// 修正: キー名だけで決まる拒否リスト。target の状態に左右されない。
function keyIsForbidden(key) {
	return key === '__proto__' || key === 'constructor' || key === 'prototype'
}

// 修正: 代入ではなく defineProperty で書く。キーが何であってもセッターを通らず、
// 普通の代入と同じ「書き換え可・列挙可・削除可」の own プロパティになる。
function defineValue(destination, key, value) {
	Object.defineProperty(destination, key, {
		value: value,
		writable: true,
		enumerable: true,
		configurable: true
	});
}

// Protects from prototype poisoning and unexpected merging up the prototype chain.
function propertyIsUnsafe(target, key) {
	return propertyIsOnObject(target, key) // Properties are safe to merge if they don't exist in the target yet,
		&& !(Object.hasOwnProperty.call(target, key) // unsafe if they exist up the prototype chain,
			&& Object.propertyIsEnumerable.call(target, key)) // and also unsafe if they're nonenumerable.
}

function mergeObject(target, source, options) {
	var destination = {};
	if (options.isMergeableObject(target)) {
		getKeys(target).forEach(function(key) {
			// 修正: 原本は target 側のループに防御が無かった
			if (keyIsForbidden(key)) {
				return
			}
			defineValue(destination, key, cloneUnlessOtherwiseSpecified(target[key], options));
		});
	}
	getKeys(source).forEach(function(key) {
		// 修正: target の状態に関係なく、危ないキー名は先に捨てる
		if (keyIsForbidden(key) || propertyIsUnsafe(target, key)) {
			return
		}

		if (propertyIsOnObject(target, key) && options.isMergeableObject(source[key])) {
			defineValue(destination, key, getMergeFunction(key, options)(target[key], source[key], options));
		} else {
			defineValue(destination, key, cloneUnlessOtherwiseSpecified(source[key], options));
		}
	});
	return destination
}

function deepmerge(target, source, options) {
	options = options || {};
	options.arrayMerge = options.arrayMerge || defaultArrayMerge;
	options.isMergeableObject = options.isMergeableObject || isMergeableObject;
	// cloneUnlessOtherwiseSpecified is added to `options` so that custom arrayMerge()
	// implementations can use it. The caller may not replace it.
	options.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;

	var sourceIsArray = Array.isArray(source);
	var targetIsArray = Array.isArray(target);
	var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;

	if (!sourceAndTargetTypesMatch) {
		return cloneUnlessOtherwiseSpecified(source, options)
	} else if (sourceIsArray) {
		return options.arrayMerge(target, source, options)
	} else {
		return mergeObject(target, source, options)
	}
}

deepmerge.all = function deepmergeAll(array, options) {
	if (!Array.isArray(array)) {
		throw new Error('first argument should be an array')
	}

	return array.reduce(function(prev, next) {
		return deepmerge(prev, next, options)
	}, {})
};

var deepmerge_1 = deepmerge;

module.exports = deepmerge_1;
