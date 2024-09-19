main = asdf+

asdf = _ pattern:sexpr _ "->" _ template:sexpr _ ";" _ { return {pattern, template, next: []} }
     / _ pattern:sexpr _ "->" _ template:sexpr _ "{" _ next:asdf+ _ "}" _ {return {pattern, template, next} }

sexpr = _ atom:word _ {return atom}
      / _ "(" list:sexpr|.., _| ")" _ { return list }

word       = chars: (!delimiter @.)+ { return chars.join("") }
space      = " " / [\n\r\t]
comment    = "//" (![\n\r] .)*

paren      = "(" / ")"
delimiter  = paren / space / "{" / "}" / ";"

_ = (space / comment)*
