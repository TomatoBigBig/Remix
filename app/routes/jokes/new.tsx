import type { ActionFunction, LoaderFunction } from "remix";
import { redirect, useActionData, json, useCatch } from "remix";
import { requireUserId, getUserId } from "~/utils/session.server";
import { db } from "~/utils/db.server";

export const loader: LoaderFunction = async ({
  request,
}) => {
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return {};
};

//表单数据验证
function validateJokeContent(content: string) {
  if (content.length < 10) {
    return `That joke is too short`;
  }
}


//表单数据验证
function validateJokeName(name: string) {
  if (name.length < 3) {
    return `That joke's name is too short`;
  }
}


//错误类型
type ActionData = {
  formError?: string;
  fieldErrors?: {
    name: string | undefined;
    content: string | undefined;
  };
  fields?: {
    name: string;
    content: string;
  };
};

// 创建以恶搞错误返回
const badRequest = (data: ActionData) =>
  json(data, { status: 400 });

export const action: ActionFunction = async ({
  request,
}) => {
  const userId = await requireUserId(request)
  const form = await request.formData();// 获取表单数据
  const name = form.get("name");
  const content = form.get("content");
  // we do this type check to be extra sure and to make TypeScript happy
  // we'll explore validation next!
  if (
    typeof name !== "string" ||
    typeof content !== "string"
  ) {
    // throw new Error(`Form not submitted correctly.`);
    return badRequest({
      formError: `Form not submitted correctly.`,
    });
  }// 判断数据类型


  const fieldErrors = {
    name: validateJokeName(name),
    content: validateJokeContent(content),
  };

  const fields = { name, content };//数据组装

  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({ fieldErrors, fields });
  }// 判断数据是否符合要求

  const joke = await db.joke.create({ 
    data: { ...fields, jokesterId: userId} 
  });//添加接口
  console.log('添加返回', joke)
  return redirect(`/jokes/${joke.id}`);
};



export default function NewJokeRoute() {

    const actionData = useActionData<ActionData>();

    return (
      <div>
        <p>Add your own hilarious joke</p>
        <form method="post">
          <div>
            <label>
              Name: <input 
                      type="text"
                      defaultValue={actionData?.fields?.name}
                      name="name"
                      aria-invalid={
                        Boolean(actionData?.fieldErrors?.name) ||
                        undefined
                      }
                      aria-errormessage={
                        actionData?.fieldErrors?.name
                          ? "name-error"
                          : undefined
                      }
                    />
            </label>
            {actionData?.fieldErrors?.name ? (
              <p
                className="form-validation-error"
                role="alert"
                id="name-error"
              >
                {actionData.fieldErrors.name}
              </p>
            ) : null}
          </div>
          <div>
            <label>
              Content: <textarea
                        name="content"
                        defaultValue={actionData?.fields?.content}
                        aria-invalid={
                          Boolean(actionData?.fieldErrors?.content) ||
                          undefined
                        }
                        aria-errormessage={
                          actionData?.fieldErrors?.content
                            ? "content-error"
                            : undefined
                        }
                       />
            </label>
            {actionData?.fieldErrors?.content ? (
              <p
                className="form-validation-error"
                role="alert"
                id="content-error"
              >
                {actionData.fieldErrors.content}
              </p>
            ) : null}
          </div>
          <div>
            <button type="submit" className="button">
              Add
            </button>
          </div>
        </form>
      </div>
    );
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 401) {
    return (
      <div className="error-container">
        <p>You must be logged in to create a joke.</p>
        <Link to="/login">Login</Link>
      </div>
    );
  }
}

export function ErrorBoundary() {
  return (
    <div className="error-container">
      Something unexpected went wrong. Sorry about that.
    </div>
  );
}