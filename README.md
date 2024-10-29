# Vivaldi [Matrix](https://rezmason.github.io/matrix)

Adapting the beloved matrix rain code as [Vivaldi browser](https://vivaldi.com) start page background.

## Configuration steps

### File location

Move all repository files to `/opt/vivaldi/resources/vivaldi`.

### Add custom css rules

On `style/common.css` add as first line:
```css
@import "custom.css";
```

### Add matrix script

On `window.html` add `<script type="module" src="matrix.js"></script>` inside the `<body>` tag.

```html
<body>
  <script type="module" src="matrix.js"></script>
</body>
```

### Add canvas

Adding the canvas is the tricky part. It can be break down on these steps:

1) Find `startpage-content` string on `bundle.js`. I recommend use powerful text editor as `vim` due to the file size.
2) Find the obfuscated function to create the element. Eg.: `i8("div",{className:"startpage-content"...` (function will be `i8`).
3) Use the function to add a canvas before `startpage-content` function: `i8("canvas"),i8("div",{className:"startpage-content"`
4) Save and exit

### Enabling webGL support on Linux

WebGL suport on Linux is made in two steps:

1) Enabling unsafe webgpu on: [vivaldi://flags/#enable-unsafe-webgpu](vivaldi://flags/#enable-unsafe-webgpu)
2) Starting vivaldi with the `Vulkan` flag: `vivaldi --enable-features=Vulkan`

## Inpecting Vivaldi start page

To inspect vivaldi UI you need to start vivaldi with this two new flags: `vivaldi --debug-packed-apps --silent-debugger-extension-api --enable-features=Vulkan`

## Problems

- Vivaldi is not able to run `regl` renderer due to a CORS policy when `regl` try to compile the shaders. Solved using `webgpu` renderer.