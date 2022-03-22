import type {  ActionFunction, LoaderFunction } from "remix";
import  { Link, useLoaderData, useParams, useCatch, redirect } from "remix";
import { db } from "~/utils/db.server";

import { getUserId, requireUserId } from "~/utils/session.server";

import type { Joke } from "@prisma/client";
type LoaderData = { joke: Joke; isOwner: boolean };


export const loader: LoaderFunction = async ({
  params,
  request
}) => {
  const userId = await getUserId(request);
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId },
  });
  console.log(joke)
  if (!joke) {
    throw new Response("What a joke! Not found.", {
      status: 404,
    });
  }
  const data: LoaderData = { 
    joke,
    isOwner: userId === joke.jokesterId
  };
  return data
};

export const action: ActionFunction = async ({
  request,
  params
}) => {
  // 获取事件残数
  const form = await request.formData();
  if(form.get("_method") !== "delete") {
    throw new Response(
      `The _method ${form.get("_method")} is not supported`,
      { status: 400 }
    )
  }
  // 获取当前用户id
  const userId = await requireUserId(request);
  // 获取当前jokeid
  const joke = await db.joke.findUnique({
    where:{ id:params.jokeId }
  });
  if (!joke) {
    throw new Response("Can't delete what does not exist", {
      status: 404,
    });
  }
  if (joke.jokesterId !== userId) {
    throw new Response(
      "Pssh, nice try. That's not your joke",
      {
        status: 401,
      }
    );
  }
  await db.joke.delete({where:{id:params.jokeId}})
  return redirect("/jokes")
}

export default function JokeRoute() {
    
  const data = useLoaderData<LoaderData>();
  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{data.joke.content}</p>
      <Link to=".">{data.joke.name} Permalink</Link>
      {data.isOwner?(
        <form method="post">
          <input
            type="hidden"
            name="_method"
            value="delete"
          />
          <button type="submit" className="button">
            Delete
          </button>
        </form>
      ):null}
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();
  if (caught.status === 404) {
    return (
      <div className="error-container">
        Huh? What the heck is "{params.jokeId}"?
      </div>
    );
  }
  throw new Error(`Unhandled error: ${caught.status}`);
}

export function ErrorBoundary() {
  const { jokeId } = useParams();
  return (
    <div className="error-container">{`There was an error loading joke by the id ${jokeId}. Sorry.`}</div>
  );
}