use worker::*;

#[event(fetch)]
async fn fetch(req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    let url = req.url()?;
    match url.path() {
        "/health" => Response::ok("preview-worker OK"),
        _ => Response::error("Not Found", 404),
    }
}
