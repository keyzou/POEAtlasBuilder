module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    fontFamily: {
      sans: ['Inter']
    },
    extend: {}
  },
  plugins: [],
  mode: process.env.NODE_ENV ? 'jit' : undefined
}
