export type RawSpan = {
  api_name: string;
  call_service_type: string;
  children: RawSpan[];
  duration_microseconds: string;
  hostname?: string;
  operation_name: string;
  service_name?: string;
  span_id?: string;
  start_time_microsecond: string;
  status: number;
};

export type TimelineSpanNode = {
  id: string;
  name: string;
  start: number;
  duration: number;
  error: boolean;
  open: boolean;
  isLastClicked: boolean;
  componentTag: string;
  serviceName: string;
  hostname: string;
  children: TimelineSpanNode[];
};

const isError = (status: number): boolean => status !== 0;

const getName = (span: RawSpan): string => {
  if (span.operation_name === "request" && span.api_name) {
    return `${span.api_name} ${span.operation_name}`;
  }
  if (span.operation_name) return span.operation_name;
  return span.api_name || "unknown";
};

const guessServiceName = (span: RawSpan): string => {
  if (span.api_name.includes("_bb")) return "server_b";
  if (span.api_name.includes("_cc")) return "server_c";
  return "server_a";
};

const getComponentTag = (span: RawSpan): string => {
  const serviceType = span.call_service_type?.trim().toLowerCase();
  if (serviceType) return serviceType;

  const op = span.operation_name?.trim().toLowerCase();
  if (!op) return "unknown";

  if (op.includes(".")) {
    const [prefix] = op.split(".");
    return prefix || "unknown";
  }

  if (op.includes("_")) {
    const [prefix] = op.split("_");
    return prefix || "unknown";
  }

  return op || "unknown";
};

const toNode = (span: RawSpan, path: number[]): TimelineSpanNode => {
  const duration = Number(span.duration_microseconds);
  return {
    id: span.span_id || `node-${path.join("-")}`,
    name: getName(span),
    start: Number(span.start_time_microsecond),
    duration,
    error: isError(span.status),
    open: true,
    isLastClicked: false,
    componentTag: getComponentTag(span),
    serviceName: span.service_name || guessServiceName(span),
    hostname: span.hostname || "10.88.127.255",
    children: span.children.map((child, index) => toNode(child, [...path, index])),
  };
};

const collectRange = (
  nodes: TimelineSpanNode[],
  acc: { min: number; max: number },
): void => {
  for (const node of nodes) {
    const end = node.start + node.duration;
    if (node.start < acc.min) acc.min = node.start;
    if (end > acc.max) acc.max = end;
    collectRange(node.children, acc);
  }
};

export const sampleTrace: RawSpan[] = [
  {
    api_name: "/resource_aa",
    call_service_type: "",
    duration_microseconds: "2645756",
    operation_name: "request",
    span_id: "202602221540540059bb72a6648b8d89",
    start_time_microsecond: "1771774855030459",
    status: 0,
    children: [
      {
        api_name: "/resource_aa",
        call_service_type: "",
        duration_microseconds: "1564789",
        operation_name: "sleep",
        span_id: "202602221540540059bb72a687b2d407",
        start_time_microsecond: "1771774855060633",
        status: 0,
        children: [],
      },
      {
        api_name: "/resource_aa",
        call_service_type: "http",
        duration_microseconds: "527421",
        operation_name: "http_call",
        span_id: "2026022215405500da9759001a37a118",
        start_time_microsecond: "1771774856645614",
        status: 0,
        children: [
          {
            api_name: "/resource_cc1",
            call_service_type: "",
            duration_microseconds: "526990",
            operation_name: "request",
            span_id: "2026022215405600c6a486e19e845b2f",
            start_time_microsecond: "1771774856645845",
            status: 0,
            children: [
              {
                api_name: "/resource_cc1",
                call_service_type: "",
                duration_microseconds: "520287",
                operation_name: "sleep",
                span_id: "2026022215405600c6a486e13250d29d",
                start_time_microsecond: "1771774856645881",
                status: 0,
                children: [],
              },
              {
                api_name: "/resource_cc1",
                call_service_type: "redis",
                duration_microseconds: "178",
                operation_name: "redis.command",
                span_id: "2026022215405600c6a486e1590c04e1",
                start_time_microsecond: "1771774857169366",
                status: 0,
                children: [],
              },
              {
                api_name: "/resource_cc1",
                call_service_type: "redis",
                duration_microseconds: "86",
                operation_name: "redis.command",
                span_id: "2026022215405600c6a486e16145e59e",
                start_time_microsecond: "1771774857172710",
                status: 0,
                children: [],
              },
            ],
          },
        ],
      },
      {
        api_name: "/resource_aa",
        call_service_type: "http",
        duration_microseconds: "1000327",
        operation_name: "http_call",
        span_id: "2026022215405500da975900d61c3b63",
        start_time_microsecond: "1771774856675756",
        status: 1,
        children: [
          {
            api_name: "/resource_bb",
            call_service_type: "",
            duration_microseconds: "1189183",
            operation_name: "request",
            span_id: "2026022215405600da732b8173ed6d06",
            start_time_microsecond: "1771774856676165",
            status: 500,
            children: [
              {
                api_name: "/resource_bb",
                call_service_type: "http",
                duration_microseconds: "967573",
                operation_name: "http_call",
                span_id: "2026022215405600da732b8179167a7a",
                start_time_microsecond: "1771774856706391",
                status: 0,
                children: [
                  {
                    api_name: "/resource_cc",
                    call_service_type: "",
                    duration_microseconds: "967156",
                    operation_name: "request",
                    span_id: "2026022215405600c6a486e1ff4b99e5",
                    start_time_microsecond: "1771774856706593",
                    status: 0,
                    children: [
                      {
                        api_name: "/resource_cc",
                        call_service_type: "",
                        duration_microseconds: "958265",
                        operation_name: "sleep",
                        span_id: "2026022215405600c6a486e1d47fd876",
                        start_time_microsecond: "1771774856706611",
                        status: 0,
                        children: [],
                      },
                      {
                        api_name: "/resource_cc",
                        call_service_type: "mysql",
                        duration_microseconds: "872",
                        operation_name: "mysql.query",
                        span_id: "20260222154057001d7c7add998043bd",
                        start_time_microsecond: "1771774857668073",
                        status: 0,
                        children: [],
                      },
                      {
                        api_name: "/resource_cc",
                        call_service_type: "mysql",
                        duration_microseconds: "1624",
                        operation_name: "mysql.query",
                        span_id: "20260222154057001d7c7addce708335",
                        start_time_microsecond: "1771774857672099",
                        status: 0,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                api_name: "/resource_bb",
                call_service_type: "",
                duration_microseconds: "100422",
                operation_name: "sleep",
                span_id: "2026022215405700ca748f2eda237687",
                start_time_microsecond: "1771774857704199",
                status: 0,
                children: [],
              },
              {
                api_name: "/resource_bb",
                call_service_type: "http",
                duration_microseconds: "18",
                operation_name: "http_call",
                span_id: "2026022215405700ca748f2ea0a3265a",
                start_time_microsecond: "1771774857834844",
                status: 1,
                children: [],
              },
              {
                api_name: "/resource_bb",
                call_service_type: "http",
                duration_microseconds: "17",
                operation_name: "http_call",
                span_id: "2026022215405700ca748f2e78785a14",
                start_time_microsecond: "1771774857865196",
                status: 1,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
];

export const normalizeSampleTrace = (): {
  nodes: TimelineSpanNode[];
  startUs: number;
  totalUs: number;
} => {
  const nodes = sampleTrace.map((span, index) => toNode(span, [index]));
  const range = { min: Number.POSITIVE_INFINITY, max: 0 };
  collectRange(nodes, range);
  const startUs = range.min;
  const totalUs = Math.max(1, range.max - range.min);
  return { nodes, startUs, totalUs };
};
