export default {
  routes: [
    {
      // Path defined with a URL parameter
      method: "GET",
      path: "/bdcs/get-document/:id",
      handler: "bdc.exportbdc",
    },
  ],
};
