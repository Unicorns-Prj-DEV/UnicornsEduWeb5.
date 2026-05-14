type ProxyAuthGuardRequest = {
  pathname: string;
  searchParams: URLSearchParams;
  headers: Pick<Headers, "get" | "has">;
};

function isNextRouterPrefetch(headers: Pick<Headers, "get" | "has">) {
  return (
    headers.has("next-router-prefetch") ||
    headers.get("purpose")?.toLowerCase() === "prefetch"
  );
}

function isNextAppRouterDataRequest(request: ProxyAuthGuardRequest) {
  return (
    request.headers.get("rsc") === "1" ||
    request.headers.has("next-router-state-tree") ||
    request.searchParams.has("_rsc")
  );
}

export function shouldVerifySessionInProxy(request: ProxyAuthGuardRequest) {
  if (isNextRouterPrefetch(request.headers)) {
    return false;
  }

  if (isNextAppRouterDataRequest(request)) {
    return false;
  }

  return true;
}
