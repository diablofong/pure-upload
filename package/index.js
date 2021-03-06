"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function addEventHandler(el, event, handler) {
    if (el.addEventListener) {
        el.addEventListener(event, handler);
    }
    else {
        var elem = el;
        if (elem.attachEvent) {
            elem.attachEvent('on' + event, handler);
        }
        else {
            elem[event] = handler;
        }
    }
}
exports.addEventHandler = addEventHandler;
exports.isFileApi = !!(window.File && window.FormData);
function castFiles(fileList, status) {
    var files;
    if (typeof fileList === 'object') {
        files = Object.keys(fileList)
            .filter(function (key) { return key !== 'length'; })
            .map(function (key) { return fileList[key]; });
    }
    else {
        files = fileList;
    }
    files.forEach(function (file) {
        file.uploadStatus = status || file.uploadStatus;
        file.responseCode = file.responseCode || 0;
        file.responseText = file.responseText || '';
        file.progress = file.progress || 0;
        file.sentBytes = file.sentBytes || 0;
        file.cancel = file.cancel || (function () { return; });
    });
    return files;
}
exports.castFiles = castFiles;
function decorateSimpleFunction(origFn, newFn, newFirst) {
    if (newFirst === void 0) { newFirst = false; }
    if (!origFn)
        return newFn;
    return newFirst
        ? function () { newFn(); origFn(); }
        : function () { origFn(); newFn(); };
}
exports.decorateSimpleFunction = decorateSimpleFunction;
function applyDefaults(target, source) {
    var to = Object(target);
    for (var nextKey in source) {
        if (Object.prototype.hasOwnProperty.call(source, nextKey) && (to[nextKey] === undefined || to[nextKey] === null)) {
            to[nextKey] = source[nextKey];
        }
    }
    return to;
}
;
function getUploadCore(options, callbacks) {
    return new UploadCore(options, callbacks);
}
exports.getUploadCore = getUploadCore;
;
function getUploader(options, callbacks) {
    return new Uploader(options, callbacks);
}
exports.getUploader = getUploader;
;
function getValueOrResult(valueOrGetter) {
    if (typeof valueOrGetter === 'function')
        return valueOrGetter();
    return valueOrGetter;
}
exports.getValueOrResult = getValueOrResult;
function newGuid() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        /* tslint:disable */
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        /* tslint:enable */
    });
    return uuid;
}
exports.newGuid = newGuid;
;
function getDefaultLocalizer() {
    return {
        fileSizeInvalid: function (maxFileSize) { return 'The selected file exceeds the allowed size of ' + maxFileSize
            + ' or its size is 0 MB. Please choose another file.'; },
        fileTypeInvalid: function (accept) { return 'File format is not allowed. Only ' + (accept ? accept : '') + ' files are allowed.'; },
        invalidResponseFromServer: function () { return 'Invalid response from server'; }
    };
}
function removeEventHandler(el, event, handler) {
    if (el.removeEventListener) {
        el.removeEventListener(event, handler);
    }
    else {
        var elem = el;
        if (elem.detachEvent) {
            elem.detachEvent('on' + event, handler);
        }
        else {
            elem[event] = null;
        }
    }
}
exports.removeEventHandler = removeEventHandler;
var UploadArea = (function () {
    function UploadArea(targetElement, options, uploader) {
        this.targetElement = targetElement;
        this.options = applyDefaults(options, this.defaultOptions());
        this.uploader = uploader;
        this.uploadCore = getUploadCore(this.options, this.uploader.queue.callbacks);
        if (exports.isFileApi) {
            this.setupFileApiElements();
        }
        else {
            throw 'Only browsers with FileAPI supported.';
        }
    }
    UploadArea.prototype.start = function (autoClear) {
        if (autoClear === void 0) { autoClear = false; }
        if (this.options.manualStart && this.fileList) {
            this.putFilesToQueue();
            if (autoClear)
                this.clear();
        }
    };
    UploadArea.prototype.clear = function () {
        this.fileList = null;
    };
    UploadArea.prototype.destroy = function () {
        if (this.unregisterOnClick)
            this.unregisterOnClick();
        if (this.unregisterOnDrop)
            this.unregisterOnDrop();
        if (this.unregisterOnChange)
            this.unregisterOnChange();
        if (this.unregisterOnDragOver)
            this.unregisterOnDragOver();
        if (this.unregisterOnDragLeave)
            this.unregisterOnDragLeave();
        if (this.unregisterOnDragOverGlobal)
            this.unregisterOnDragOverGlobal();
        if (this.unregisterOnDragLeaveGlobal)
            this.unregisterOnDragLeaveGlobal();
        document.body.removeChild(this.fileInput);
    };
    UploadArea.prototype.defaultOptions = function () {
        return {
            localizer: getDefaultLocalizer(),
            maxFileSize: 1024,
            allowDragDrop: true,
            clickable: true,
            accept: '*.*',
            validateExtension: false,
            multiple: true,
            allowEmptyFile: false
        };
    };
    UploadArea.prototype.selectFiles = function (fileList) {
        var _this = this;
        this.fileList = castFiles(fileList);
        if (this.options.onFileSelected)
            this.fileList.forEach(function (file) {
                if (_this.options.onFileSelected)
                    _this.options.onFileSelected(file);
            });
        if (!this.options.manualStart)
            this.putFilesToQueue();
    };
    UploadArea.prototype.putFilesToQueue = function () {
        var _this = this;
        if (!this.fileList)
            return;
        this.fileList.forEach(function (file) {
            file.guid = newGuid();
            delete file.uploadStatus;
            file.url = _this.uploadCore.getUrl(file);
            file.onError = _this.options.onFileError || (function () { ; });
            file.onCancel = _this.options.onFileCanceled || (function () { ; });
            if (_this.validateFile(file)) {
                file.start = function () {
                    _this.uploadCore.upload([file]);
                    if (_this.options.onFileAdded) {
                        _this.options.onFileAdded(file);
                    }
                    file.start = function () { return; };
                };
            }
            else {
                file.onError(file);
            }
        });
        this.uploader.queue.addFiles(this.fileList);
    };
    UploadArea.prototype.validateFile = function (file) {
        if (!this.isFileSizeValid(file)) {
            file.uploadStatus = UploadStatus.failed;
            file.responseText = this.options.localizer.fileSizeInvalid(this.options.maxFileSize);
            return false;
        }
        if (this.isFileTypeInvalid(file)) {
            file.uploadStatus = UploadStatus.failed;
            file.responseText = this.options.localizer.fileTypeInvalid(this.options.accept);
            return false;
        }
        return true;
    };
    UploadArea.prototype.setupFileApiElements = function () {
        var _this = this;
        this.fileInput = document.createElement('input');
        this.fileInput.setAttribute('type', 'file');
        this.fileInput.setAttribute('accept', this.options.accept ? this.options.accept : '');
        this.fileInput.style.display = 'none';
        var onChange = function (e) { return _this.onChange(e); };
        addEventHandler(this.fileInput, 'change', onChange);
        this.unregisterOnChange = function () { return removeEventHandler(_this.fileInput, 'change', onchange); };
        if (this.options.multiple) {
            this.fileInput.setAttribute('multiple', '');
        }
        this.registerEvents();
        // attach to body
        document.body.appendChild(this.fileInput);
    };
    UploadArea.prototype.registerEvents = function () {
        var _this = this;
        var onClick = function () { return _this.onClick(); };
        addEventHandler(this.targetElement, 'click', onClick);
        this.unregisterOnClick = function () { return removeEventHandler(_this.targetElement, 'click', onClick); };
        var onDrag = function (e) { return _this.onDrag(e); };
        addEventHandler(this.targetElement, 'dragover', onDrag);
        this.unregisterOnDragOver = function () { return removeEventHandler(_this.targetElement, 'dragover', onDrag); };
        var onDragLeave = function () { return _this.onDragLeave(); };
        addEventHandler(this.targetElement, 'dragleave', onDragLeave);
        this.unregisterOnDragOver = function () { return removeEventHandler(_this.targetElement, 'dragleave', onDragLeave); };
        var onDragGlobal = function () { return _this.onDragGlobal(); };
        addEventHandler(document.body, 'dragover', onDragGlobal);
        this.unregisterOnDragOverGlobal = function () { return removeEventHandler(document.body, 'dragover', onDragGlobal); };
        var onDragLeaveGlobal = function () { return _this.onDragLeaveGlobal(); };
        addEventHandler(document.body, 'dragleave', onDragLeaveGlobal);
        this.unregisterOnDragOverGlobal = function () { return removeEventHandler(document.body, 'dragleave', onDragLeaveGlobal); };
        var onDrop = function (e) { return _this.onDrop(e); };
        addEventHandler(this.targetElement, 'drop', onDrop);
        this.unregisterOnDrop = function () { return removeEventHandler(_this.targetElement, 'drop', onDrop); };
    };
    UploadArea.prototype.onChange = function (e) {
        this.selectFiles(e.target.files);
    };
    UploadArea.prototype.onDrag = function (e) {
        if (!getValueOrResult(this.options.allowDragDrop))
            return;
        this.addDragOverStyle(this.options.dragOverStyle);
        var efct = undefined;
        try {
            efct = e.dataTransfer.effectAllowed;
        }
        catch (err) {
            ;
        }
        e.dataTransfer.dropEffect = 'move' === efct || 'linkMove' === efct ? 'move' : 'copy';
        this.stopEventPropagation(e);
    };
    UploadArea.prototype.onDragLeave = function () {
        if (!getValueOrResult(this.options.allowDragDrop))
            return;
        this.removeDragOverStyle(this.options.dragOverStyle);
    };
    UploadArea.prototype.onDragGlobal = function () {
        if (!getValueOrResult(this.options.allowDragDrop))
            return;
        this.addDragOverStyle(this.options.dragOverGlobalStyle);
    };
    UploadArea.prototype.onDragLeaveGlobal = function () {
        if (!getValueOrResult(this.options.allowDragDrop))
            return;
        this.removeDragOverStyle(this.options.dragOverGlobalStyle);
    };
    UploadArea.prototype.removeDragOverStyle = function (style) {
        if (!style)
            return;
        this.targetElement.classList.remove(style);
    };
    UploadArea.prototype.addDragOverStyle = function (style) {
        if (!style)
            return;
        this.targetElement.classList.add(style);
    };
    UploadArea.prototype.onDrop = function (e) {
        if (!getValueOrResult(this.options.allowDragDrop))
            return;
        this.stopEventPropagation(e);
        if (!e.dataTransfer) {
            return;
        }
        this.removeDragOverStyle(this.options.dragOverStyle);
        var files = e.dataTransfer.files;
        if (files.length) {
            if (!this.options.multiple)
                files = [files[0]];
            var items = e.dataTransfer.items;
            if (items && items.length && (items[0].webkitGetAsEntry !== null)) {
                if (!this.options.multiple) {
                    var newItems = [items[0]];
                    this.addFilesFromItems(newItems);
                }
                else {
                    this.addFilesFromItems(items);
                }
            }
            else {
                this.handleFiles(files);
            }
        }
    };
    UploadArea.prototype.isIeVersion = function (v) {
        return RegExp('msie' + (!isNaN(v) ? ('\\s' + v.toString()) : ''), 'i').test(navigator.userAgent);
    };
    UploadArea.prototype.onClick = function () {
        var _this = this;
        if (!getValueOrResult(this.options.clickable))
            return;
        this.fileInput.value = '';
        if (this.isIeVersion(10)) {
            setTimeout(function () { _this.fileInput.click(); }, 200);
        }
        else {
            this.fileInput.click();
        }
    };
    UploadArea.prototype.addFilesFromItems = function (items) {
        var entry;
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if ((item.webkitGetAsEntry) && (entry = item.webkitGetAsEntry())) {
                if (entry.isFile) {
                    this.selectFiles([item.getAsFile()]);
                }
                else if (entry.isDirectory) {
                    this.processDirectory(entry, entry.name);
                }
            }
            else if (item.getAsFile) {
                if (!item.kind || item.kind === 'file') {
                    this.selectFiles([item.getAsFile()]);
                }
            }
        }
    };
    UploadArea.prototype.processDirectory = function (directory, path) {
        var dirReader = directory.createReader();
        var self = this;
        var entryReader = function (entries) {
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                if (entry.isFile) {
                    entry.file(function (file) {
                        if (file.name.substring(0, 1) === '.') {
                            return;
                        }
                        file.fullPath = '' + path + '/' + file.name;
                        self.selectFiles([file]);
                    });
                }
                else if (entry.isDirectory) {
                    self.processDirectory(entry, '' + path + '/' + entry.name);
                }
            }
        };
        dirReader.readEntries(entryReader, function (error) {
            return typeof console !== 'undefined' && console !== null
                ? typeof console.log === 'function' ? console.log(error) : void 0
                : void 0;
        });
    };
    UploadArea.prototype.handleFiles = function (files) {
        for (var i = 0; i < files.length; i++) {
            this.selectFiles([files[i]]);
        }
    };
    UploadArea.prototype.isFileSizeValid = function (file) {
        var maxFileSize = this.options.maxFileSize * 1024 * 1024; // max file size in bytes
        if (file.size > maxFileSize || (!this.options.allowEmptyFile && file.size === 0))
            return false;
        return true;
    };
    UploadArea.prototype.isFileTypeInvalid = function (file) {
        if (file.name && this.options.accept && (this.options.accept.trim() !== '*' || this.options.accept.trim() !== '*.*') &&
            this.options.validateExtension && this.options.accept.indexOf('/') === -1) {
            var acceptedExtensions = this.options.accept.split(',');
            var fileExtension = file.name.substring(file.name.lastIndexOf('.'), file.name.length);
            if (fileExtension.indexOf('.') === -1)
                return true;
            var isFileExtensionExisted = true;
            for (var i = 0; i < acceptedExtensions.length; i++) {
                if (acceptedExtensions[i].toUpperCase().trim() === fileExtension.toUpperCase()) {
                    isFileExtensionExisted = false;
                }
            }
            return isFileExtensionExisted;
        }
        return false;
    };
    UploadArea.prototype.stopEventPropagation = function (e) {
        e.stopPropagation();
        if (e.preventDefault) {
            e.preventDefault();
        }
        else {
            e.returnValue = false;
        }
    };
    return UploadArea;
}());
exports.UploadArea = UploadArea;
var UploadCore = (function () {
    function UploadCore(options, callbacks) {
        if (callbacks === void 0) { callbacks = {}; }
        this.callbacks = callbacks;
        this.options = applyDefaults(options, this.getDefaultOptions());
        this.setFullCallbacks(callbacks);
    }
    UploadCore.prototype.upload = function (fileList) {
        var _this = this;
        if (!exports.isFileApi)
            return;
        var files = castFiles(fileList, UploadStatus.uploading);
        files.forEach(function (file) { return _this.processFile(file); });
    };
    UploadCore.prototype.getUrl = function (file) {
        return typeof this.options.url === 'function'
            ? this.options.url(file)
            : this.options.url;
    };
    UploadCore.prototype.processFile = function (file) {
        var xhr = this.createRequest(file);
        this.setCallbacks(xhr, file);
        this.send(xhr, file);
    };
    UploadCore.prototype.createRequest = function (file) {
        var xhr = new XMLHttpRequest();
        var url = file.url || this.getUrl(file);
        xhr.open(this.options.method, url, true);
        xhr.withCredentials = !!this.options.withCredentials;
        this.setHeaders(xhr);
        return xhr;
    };
    UploadCore.prototype.setHeaders = function (xhr) {
        var _this = this;
        if (!this.options.headers)
            return;
        if (!this.options.headers['Accept'])
            xhr.setRequestHeader('Accept', 'application/json');
        if (!this.options.headers['Cache-Control'])
            xhr.setRequestHeader('Cache-Control', 'no-cache');
        if (!this.options.headers['X-Requested-With'])
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        Object.keys(this.options.headers).forEach(function (headerName) {
            if (!_this.options.headers)
                return;
            var headerValue = _this.options.headers[headerName];
            if (headerValue !== undefined && headerValue !== null)
                xhr.setRequestHeader(headerName, (headerValue || '').toString());
        });
    };
    UploadCore.prototype.setCallbacks = function (xhr, file) {
        var _this = this;
        file.cancel = decorateSimpleFunction(file.cancel, function () {
            xhr.abort();
            file.uploadStatus = UploadStatus.canceled;
            if (file.onCancel)
                file.onCancel(file);
            if (_this.callbacks.onCancelledCallback)
                _this.callbacks.onCancelledCallback(file);
            if (_this.callbacks.onFileStateChangedCallback)
                _this.callbacks.onFileStateChangedCallback(file);
            if (_this.callbacks.onFinishedCallback)
                _this.callbacks.onFinishedCallback(file);
        }, true);
        xhr.onload = function () { return _this.onload(file, xhr); };
        xhr.onerror = function () { return _this.handleError(file, xhr); };
        xhr.upload.onprogress = function (e) { return _this.updateProgress(file, e); };
    };
    UploadCore.prototype.send = function (xhr, file) {
        var formData = this.createFormData(file);
        if (this.callbacks.onUploadStartedCallback)
            this.callbacks.onUploadStartedCallback(file);
        if (this.callbacks.onFileStateChangedCallback)
            this.callbacks.onFileStateChangedCallback(file);
        xhr.send(formData);
    };
    UploadCore.prototype.createFormData = function (file) {
        var _this = this;
        var formData = new FormData();
        if (this.options.params) {
            Object.keys(this.options.params).forEach(function (paramName) {
                if (!_this.options.params)
                    return;
                var paramValue = _this.options.params[paramName];
                if (paramValue !== undefined && paramValue !== null)
                    formData.append(paramName, _this.castParamType(paramValue));
            });
        }
        formData.append('file', file, file.name);
        return formData;
    };
    UploadCore.prototype.castParamType = function (param) {
        return this.isBoolean(param) || this.isNumber(param) ? param.toString() : param;
    };
    UploadCore.prototype.isNumber = function (param) {
        return typeof param === 'number';
    };
    UploadCore.prototype.isBoolean = function (param) {
        return typeof param === 'number';
    };
    UploadCore.prototype.handleError = function (file, xhr) {
        file.uploadStatus = UploadStatus.failed;
        this.setResponse(file, xhr);
        if (file.onError) {
            file.onError(file);
        }
        if (this.callbacks.onErrorCallback)
            this.callbacks.onErrorCallback(file);
        if (this.callbacks.onFileStateChangedCallback)
            this.callbacks.onFileStateChangedCallback(file);
        if (this.callbacks.onFinishedCallback)
            this.callbacks.onFinishedCallback(file);
    };
    UploadCore.prototype.updateProgress = function (file, e) {
        if (e) {
            if (e.lengthComputable) {
                file.progress = Math.round(100 * (e.loaded / e.total));
                file.sentBytes = e.loaded;
            }
            else {
                file.progress = 0;
                file.sentBytes = 0;
            }
        }
        else {
            file.progress = 100;
            file.sentBytes = file.size;
        }
        if (this.callbacks.onProgressCallback)
            this.callbacks.onProgressCallback(file);
    };
    UploadCore.prototype.onload = function (file, xhr) {
        if (xhr.readyState !== 4)
            return;
        if (file.progress !== 100)
            this.updateProgress(file);
        if (xhr.status === 200) {
            this.finished(file, xhr);
        }
        else {
            this.handleError(file, xhr);
        }
    };
    UploadCore.prototype.finished = function (file, xhr) {
        file.uploadStatus = UploadStatus.uploaded;
        this.setResponse(file, xhr);
        if (this.callbacks.onUploadedCallback)
            this.callbacks.onUploadedCallback(file);
        if (this.callbacks.onFileStateChangedCallback)
            this.callbacks.onFileStateChangedCallback(file);
        if (this.callbacks.onFinishedCallback)
            this.callbacks.onFinishedCallback(file);
    };
    ;
    UploadCore.prototype.setResponse = function (file, xhr) {
        file.responseCode = xhr.status;
        file.responseText = xhr.responseText || xhr.statusText || (xhr.status
            ? xhr.status.toString()
            : '' || this.options.localizer.invalidResponseFromServer());
    };
    UploadCore.prototype.getDefaultOptions = function () {
        return {
            headers: {},
            params: {},
            withCredentials: false,
            localizer: getDefaultLocalizer()
        };
    };
    UploadCore.prototype.setFullCallbacks = function (callbacks) {
        this.callbacks.onProgressCallback = callbacks.onProgressCallback || (function () { return; });
        this.callbacks.onCancelledCallback = callbacks.onCancelledCallback || (function () { return; });
        this.callbacks.onFinishedCallback = callbacks.onFinishedCallback || (function () { return; });
        this.callbacks.onUploadedCallback = callbacks.onUploadedCallback || (function () { return; });
        this.callbacks.onErrorCallback = callbacks.onErrorCallback || (function () { return; });
        this.callbacks.onUploadStartedCallback = callbacks.onUploadStartedCallback || (function () { return; });
        this.callbacks.onFileStateChangedCallback = callbacks.onFileStateChangedCallback || (function () { return; });
    };
    return UploadCore;
}());
exports.UploadCore = UploadCore;
var Uploader = (function () {
    function Uploader(options, callbacks) {
        if (options === void 0) { options = {}; }
        if (callbacks === void 0) { callbacks = {}; }
        this.setOptions(options);
        this.uploadAreas = [];
        this.queue = new UploadQueue(options, callbacks);
    }
    Uploader.prototype.setOptions = function (options) {
        this.options = options;
    };
    Uploader.prototype.registerArea = function (element, options) {
        var uploadArea = new UploadArea(element, options, this);
        this.uploadAreas.push(uploadArea);
        return uploadArea;
    };
    Uploader.prototype.unregisterArea = function (area) {
        var areaIndex = this.uploadAreas.indexOf(area);
        if (areaIndex >= 0) {
            this.uploadAreas[areaIndex].destroy();
            this.uploadAreas.splice(areaIndex, 1);
        }
    };
    return Uploader;
}());
exports.Uploader = Uploader;
var UploadQueue = (function () {
    function UploadQueue(options, callbacks) {
        this.offset = { fileCount: 0, running: false };
        this.queuedFiles = [];
        this.options = options;
        this.callbacks = callbacks;
        this.setFullOptions();
        this.setFullCallbacks();
    }
    UploadQueue.prototype.addFiles = function (files) {
        var _this = this;
        files.forEach(function (file) {
            if (!_this.queuedFiles.some(function (queuedFile) { return queuedFile === file || (!!queuedFile.guid && queuedFile.guid === file.guid); })) {
                _this.queuedFiles.push(file);
                file.remove = decorateSimpleFunction(file.remove, function () {
                    _this.removeFile(file);
                });
            }
            if (_this.callbacks.onFileAddedCallback)
                _this.callbacks.onFileAddedCallback(file);
            if (file.uploadStatus === UploadStatus.failed) {
                if (_this.callbacks.onErrorCallback) {
                    _this.callbacks.onErrorCallback(file);
                }
            }
            else {
                file.uploadStatus = UploadStatus.queued;
            }
        });
        this.filesChanged();
    };
    UploadQueue.prototype.removeFile = function (file, blockRecursive) {
        if (blockRecursive === void 0) { blockRecursive = false; }
        var index = this.queuedFiles.indexOf(file);
        if (index < 0)
            return;
        this.deactivateFile(file);
        this.queuedFiles.splice(index, 1);
        if (this.callbacks.onFileRemovedCallback)
            this.callbacks.onFileRemovedCallback(file);
        if (!blockRecursive)
            this.filesChanged();
    };
    UploadQueue.prototype.clearFiles = function (excludeStatuses, cancelProcessing) {
        var _this = this;
        if (excludeStatuses === void 0) { excludeStatuses = []; }
        if (cancelProcessing === void 0) { cancelProcessing = false; }
        if (!cancelProcessing)
            excludeStatuses = excludeStatuses.concat([UploadStatus.queued, UploadStatus.uploading]);
        this.queuedFiles
            .filter(function (file) { return excludeStatuses.indexOf(file.uploadStatus) < 0; })
            .forEach(function (file) { return _this.removeFile(file, true); });
        if (this.callbacks.onQueueChangedCallback)
            this.callbacks.onQueueChangedCallback(this.queuedFiles);
    };
    UploadQueue.prototype.filesChanged = function () {
        if (this.options.autoRemove)
            this.removeFinishedFiles();
        if (this.options.autoStart)
            this.startWaitingFiles();
        if (this.callbacks.onQueueChangedCallback)
            this.callbacks.onQueueChangedCallback(this.queuedFiles);
        this.checkAllFinished();
    };
    UploadQueue.prototype.checkAllFinished = function () {
        var unfinishedFiles = this.queuedFiles
            .filter(function (file) { return [UploadStatus.queued, UploadStatus.uploading].indexOf(file.uploadStatus) >= 0; });
        if (unfinishedFiles.length === 0 && this.callbacks.onAllFinishedCallback) {
            this.callbacks.onAllFinishedCallback();
        }
    };
    UploadQueue.prototype.setFullOptions = function () {
        this.options.maxParallelUploads = this.options.maxParallelUploads || 0;
        this.options.parallelBatchOffset = this.options.parallelBatchOffset || 0;
        this.options.autoStart = exports.isFileApi && (this.options.autoStart || false);
        this.options.autoRemove = this.options.autoRemove || false;
    };
    UploadQueue.prototype.setFullCallbacks = function () {
        var _this = this;
        this.callbacks.onFileAddedCallback = this.callbacks.onFileAddedCallback || (function () { return; });
        this.callbacks.onFileRemovedCallback = this.callbacks.onFileRemovedCallback || (function () { return; });
        this.callbacks.onAllFinishedCallback = this.callbacks.onAllFinishedCallback || (function () { return; });
        this.callbacks.onQueueChangedCallback = this.callbacks.onQueueChangedCallback || (function () { return; });
        this.callbacks.onFileStateChangedCallback = function () { return _this.filesChanged(); };
    };
    UploadQueue.prototype.startWaitingFiles = function () {
        this.getWaitingFiles().forEach(function (file) { return file.start(); });
    };
    UploadQueue.prototype.removeFinishedFiles = function () {
        var _this = this;
        this.queuedFiles
            .filter(function (file) { return [UploadStatus.uploaded, UploadStatus.canceled].indexOf(file.uploadStatus) >= 0; })
            .forEach(function (file) { return _this.removeFile(file, true); });
    };
    UploadQueue.prototype.deactivateFile = function (file) {
        if (file.uploadStatus === UploadStatus.uploading)
            file.cancel();
        file.uploadStatus = UploadStatus.removed;
        file.cancel = function () { return; };
        file.remove = function () { return; };
        file.start = function () { return; };
    };
    UploadQueue.prototype.getWaitingFiles = function () {
        if (!this.options.autoStart)
            return [];
        var result = this.queuedFiles.filter(function (file) { return file.uploadStatus === UploadStatus.queued; });
        if (this.options.maxParallelUploads) {
            var uploadingFilesCount = this.queuedFiles.filter(function (file) { return file.uploadStatus === UploadStatus.uploading; }).length;
            var count = Math.min(result.length, this.options.maxParallelUploads - uploadingFilesCount);
            if (count <= 0) {
                return [];
            }
            if (this.options.parallelBatchOffset) {
                if (!this.offset.running) {
                    this.startOffset();
                }
                count = Math.min(this.offset.fileCount + count, this.options.maxParallelUploads) - this.offset.fileCount;
                this.offset.fileCount += count;
            }
            result = result.slice(0, count);
        }
        return result;
    };
    UploadQueue.prototype.startOffset = function () {
        var _this = this;
        this.offset.fileCount = 0;
        this.offset.running = true;
        setTimeout(function () {
            _this.offset.fileCount = 0;
            _this.offset.running = false;
            _this.filesChanged();
        }, this.options.parallelBatchOffset);
    };
    return UploadQueue;
}());
exports.UploadQueue = UploadQueue;
var UploadStatus;
(function (UploadStatus) {
    UploadStatus[UploadStatus["queued"] = 0] = "queued";
    UploadStatus[UploadStatus["uploading"] = 1] = "uploading";
    UploadStatus[UploadStatus["uploaded"] = 2] = "uploaded";
    UploadStatus[UploadStatus["failed"] = 3] = "failed";
    UploadStatus[UploadStatus["canceled"] = 4] = "canceled";
    UploadStatus[UploadStatus["removed"] = 5] = "removed";
})(UploadStatus = exports.UploadStatus || (exports.UploadStatus = {}));
