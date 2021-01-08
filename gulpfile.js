const gulp = require('gulp');
const imagemin = require('gulp-imagemin');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const terser = require('gulp-terser');
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');
const cssnano = require('cssnano');
const del = require("del")
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const { src, series, parallel, dest, watch } = require('gulp');
const mode = require("gulp-mode")();
const babel = require('gulp-babel');
const webpack = require("webpack-stream");
const through = require('through2');

const jsPath = 'src/js/modules/**/*.js';
const scssPath = 'src/scss/**/*.scss';

const vendorScripts = [
    "node_modules/babel-polyfill/dist/polyfill.js"
]


function copyHtml(done) {
  return src('src/*.html').pipe(gulp.dest('dist'));
}

function imgTask(done) {
  return src('src/images/*').pipe(imagemin()).pipe(gulp.dest('dist/images'));
}

const sassOpts = {
    sourceMap       : 'development',
    outputStyle     : 'nested',
    precision       : 3,
    errLogToConsole : true
}

function scssTask(done) {
    return src(scssPath)
        .pipe(sass())
        .on('error', sass.logError)
        .pipe(mode.development( sourcemaps.init() ))
        .pipe(autoprefixer({
            cascade: false
        }))
        .pipe(mode.production(
            postcss([cssnano()])
        ))
        .pipe(mode.development( sourcemaps.write('.') ))
        .pipe(rename('styles.css'))
        .pipe(dest('dist/css'));
}

function jsTask(done) {
  return src(jsPath)
    .pipe(babel({
        presets: ["@babel/preset-env"],
        plugins: [
            "@babel/plugin-transform-runtime",
            "@babel/plugin-transform-strict-mode"
        ]
    }))
    .pipe(concat('script.babelized.js'))
    .pipe(dest('dist/js'));
}

function compileVendor(done) {
    const files = vendorScripts;
    return src(files)
        .pipe(concat("vendor.bundled.js"))
        .pipe(mode.production( terser({ output: { comments: false }}) ))
        .pipe(dest('dist/js'))
}

function concatScripts(done) {
    const files = ['dist/js/vendor.bundled.js', 'dist/js/script.webpacked.js']
    return src(files)
        .pipe(concat('script.bundled.js'))
        .pipe(dest('dist/js'))
}

function webpack_scripts(done) {
    return src('dist/js/script.babelized.js')
        .pipe(webpack({
        mode: 'development',
        devtool: 'inline-source-map'
        }))
        .pipe(rename('script.webpacked.js'))
        .pipe(mode.development( sourcemaps.init({ loadMaps: true }) ))
        .pipe(mode.production( terser({ output: { comments: false }}) ))
        .pipe(
            through.obj(function(file, enc, cb) {
                // Dont pipe through any source map files as it will be handled
                // by gulp-sourcemaps
                const isSourceMap = /\.map$/.test(file.path)
                if (!isSourceMap) this.push(file)
                cb()
            })
        )
        .pipe(mode.development( sourcemaps.write('.') ))
        .pipe(dest('dist/js'));
}

function clean() {
    return del(["dist"])
}

function watchTask() {
  watch([scssPath, jsPath], { interval: 1000 }, series(jsTask, webpack_scripts, concatScripts, parallel(scssTask)));
}

exports.scssTask = scssTask;
exports.jsTask = jsTask;
exports.imgTask = imgTask;
exports.copyHtml = copyHtml;
exports.default = series(clean, compileVendor, jsTask, webpack_scripts, concatScripts, parallel(copyHtml, imgTask, scssTask), watchTask);
exports.build = series(clean,  compileVendor, jsTask, webpack_scripts, concatScripts, parallel(copyHtml, imgTask, scssTask));