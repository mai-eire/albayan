// A Server Component (no "use client" directive) can't hand Mantine a function or reach into
// its compound components: `component={Link}` arrives on the client as a broken reference and
// `Table.Thead` is undefined there. Both crash the page at runtime with no type error, so this
// rule catches them at lint time. Fixes: LinkButton/AppLink, the named parts (TableThead…), or
// make the file a client component.
const serverBoundary = {
  meta: {
    type: "problem",
    docs: { description: "No function props or Mantine compound parts in Server Components" },
    messages: {
      componentProp:
        '`component={…}` in a Server Component reaches Mantine as a broken reference. Use LinkButton/AppLink, or add "use client".',
      compoundPart:
        '`{{name}}` is undefined in a Server Component. Use the named part (e.g. TableThead) or add "use client".',
    },
    schema: [],
  },
  create(context) {
    const body = context.sourceCode.ast.body;
    const isClient = body.some(
      (n) => n.type === "ExpressionStatement" && n.directive === "use client",
    );
    if (isClient) return {};
    const mantine = new Set();
    return {
      ImportDeclaration(node) {
        if (node.source.value === "@mantine/core" || node.source.value === "@mantine/dates") {
          for (const s of node.specifiers) mantine.add(s.local.name);
        }
      },
      JSXAttribute(node) {
        if (
          node.name.type === "JSXIdentifier" &&
          node.name.name === "component" &&
          node.value?.type === "JSXExpressionContainer" &&
          node.value.expression.type !== "Literal"
        ) {
          context.report({ node, messageId: "componentProp" });
        }
      },
      JSXMemberExpression(node) {
        if (node.object.type === "JSXIdentifier" && mantine.has(node.object.name)) {
          context.report({
            node,
            messageId: "compoundPart",
            data: { name: `${node.object.name}.${node.property.name}` },
          });
        }
      },
    };
  },
};

export default serverBoundary;
