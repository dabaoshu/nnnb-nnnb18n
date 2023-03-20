import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { cleandir } from "rollup-plugin-cleandir"

export default {
  input: 'src/index.ts',
  output: [
    // {
    //   file: 'bundle-cjs.js',
    //   dir: 'lib',
    //   format: 'cjs',
    //   // sourcemap: true,
    // },
    {
      // file: 'lib/bundle-es.js',
      dir: 'lib',
      format: 'es',
      sourcemap: true,
    }],
  plugins: [
    /** 配置插件 - 每次打包清除目标文件 */
    cleandir("./lib"),
    // babel({
    //   exclude: "node_modules/**",presets
    // }),
    resolve(),
    commonjs({ extensions: [".js", ".ts", ".json"] }),
    typescript()
  ],
  externals: ["chalk", 'ignore']
}
